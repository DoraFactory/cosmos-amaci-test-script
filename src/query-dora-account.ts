import chalk from 'chalk';
import { apiEndpoint } from './config';
import * as fs from 'fs';
import { c } from 'tar';

interface SignUpEvent {
	id: string;
	blockHeight: string;
	timestamp: string;
	txHash: string;
	stateIdx: number;
	pubKey: string;
	balance: string;
	contractAddress: string;
}

interface Transactions {
	id: string;
	timestamp: string;
	caller: string;
	contractAddress: string;
}

interface VoteTransaction {
	transactions: {
		nodes: Transactions[];
	};
}

type ResponseData<T> = {
	data: {
		transactions: {
			nodes: T[];
			pageInfo: {
				hasNextPage: boolean;
				endCursor: string;
			};
			totalCount: number;
		};
	};
};

async function fetchAllPages<T>(query: string, variables: any): Promise<T[]> {
	let hasNextPage = true;
	let offset = 0;
	const limit = 100;
	const allData: T[] = [];

	while (hasNextPage) {
		const response = (await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({
				query,
				variables: { ...variables, limit, offset },
			}),
		}).then(res => res.json())) as ResponseData<T>;

		if (!response.data || !response.data.transactions) {
			console.log('响应数据结构错误:', response);
			break;
		}

		const { nodes, pageInfo, totalCount } = response.data.transactions;

		console.log(`已获取 ${totalCount || 0} 条数据`);
		console.log(`当前页数: ${offset / limit + 1}`);

		if (pageInfo) {
			console.log(`下一页: ${pageInfo.endCursor}`);
			console.log(`是否还有下一页: ${pageInfo.hasNextPage}`);
		}

		if (!nodes || nodes.length === 0) {
			break;
		}

		allData.push(...nodes);
		hasNextPage = pageInfo?.hasNextPage || false;
		offset += limit;
	}

	return allData;
}

export async function queryVoters() {
	const contractAddressList = [
		'dora1zcm26s2q4zt37xt6hwngkf5kveav74c9utzr5q335zxj0z0ydutq9ayzrt',
		'dora1h39asayq7hru2scg8kfgmhzsaq6mtq6ahue9gphn8z8rdd3wc3msp4hhhj',
		'dora1smdzpfsy48kmkzmm4m9hsg4850czdvfncxyxp6d4h3j7qv3m4v0s0530a6',
	];

	const VOTE_QUERY = `query ($limit: Int, $offset: Int) {
			transactions(
				first: $limit, offset: $offset, orderBy: [TIMESTAMP_DESC],
				filter: {
					type: {
						equalTo: "msg:vote"
					},
					contractAddress: {
						in: ["${contractAddressList.join('", "')}"]
					}
				}
			) {
				totalCount
				pageInfo {
					endCursor
					hasNextPage
				}

				nodes {
					id
					timestamp
					caller
					contractAddress
				}
			}
		}`;

	console.log(VOTE_QUERY);
	let vote_data = await fetchAllPages<Transactions>(VOTE_QUERY, {});

	// 去重地址
	const uniqueVoters = [...new Set(vote_data.map(tx => tx.caller))];

	// 导出到CSV文件
	const csvContent = uniqueVoters.join('\n');
	fs.writeFileSync('voters.csv', 'address\n' + csvContent);

	console.log(`总共有 ${uniqueVoters.length} 个独特投票地址`);
	console.log('已导出到 voters.csv 文件');
}
