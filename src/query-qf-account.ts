import chalk from 'chalk';
import { apiEndpoint, qfApiEndpoint } from './config';
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

interface VoteEvent {
	id: string;
	timestamp: string;
	sender: string;
	contractAddress: string;
	project: string;
	amount: string;
	denom: string;
}

type ResponseData<T> = {
	data: {
		voteEvents: {
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
		const response = (await fetch(qfApiEndpoint, {
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

		if (!response.data || !response.data.voteEvents) {
			console.log('响应数据结构错误:', response);
			break;
		}

		const { nodes, pageInfo, totalCount } = response.data.voteEvents;

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

export async function queryQfVoters() {
	const VOTE_QUERY = `query ($limit: Int, $offset: Int) {
			voteEvents(
				first: $limit, offset: $offset, 
				orderBy: [TIMESTAMP_DESC]
			) {
				totalCount
				pageInfo {
					endCursor
					hasNextPage
				}
				nodes {
					id
					timestamp
					sender
					contractAddress
					project
					amount
					denom
				}
			}
		}`;

	console.log(VOTE_QUERY);
	let vote_data = await fetchAllPages<VoteEvent>(VOTE_QUERY, {});

	// 使用 sender 而不是 caller 来去重地址
	const uniqueVoters = [...new Set(vote_data.map(tx => tx.sender))];

	// 导出到CSV文件
	const csvContent = uniqueVoters.join('\n');
	fs.writeFileSync('qf-voters.csv', 'address\n' + csvContent);

	console.log(`总共有 ${uniqueVoters.length} 个独特投票地址`);
	console.log('已导出到 qf-voters.csv 文件');
}
