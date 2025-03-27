import * as fs from 'fs/promises';
import * as path from 'path';

import {
	getSignerClient,
	generateAccount,
	getSignerClientByWallet,
	signerAddress,
	getContractClient,
	getContractClientByWallet,
	defaultCoordPubKey,
	stringizing,
	getAMaciClientByWallet,
	getAMaciClientBy,
	getRegistryClientBy,
	registryContractAddress,
} from './config';
import {
	GasPrice,
	calculateFee,
	MsgSendEncodeObject,
	SignerData,
	StdFee,
} from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import { HdPath, stringToPath } from '@cosmjs/crypto';
import { coins, makeCosmoshubPath } from '@cosmjs/amino';
import { AuthInfo, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { delay } from '.';
import { genKeypair, Account, genDeactivateMessage } from './lib/circom';

import {
	MsgExecuteContractEncodeObject,
	SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate';
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { AMaciClient } from './ts/AMaci.client';
import { Groth16ProofType, MessageData, PubKey } from './ts/AMaci.types';
import { RegistryClient } from './ts/Registry.client';
import { Whitelist } from './ts/Registry.types';
import { PublicKey, batchGenMessage } from './lib/circom';
import { t } from 'tar';
import { CLIENT_RENEG_LIMIT } from 'tls';

// const readFile = promisify(fs.readFile);

async function readFile(filePath: string) {
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		return data;
	} catch (err) {
		console.error('Error:', err);
	}
}

function uint256FromDecimalString(decimalString: string) {
	return decimalString; // Placeholder for conversion logic
}

function waitUntil(endTime: Date): Promise<void> {
	return new Promise(resolve => {
		const interval = setInterval(() => {
			const now = new Date();
			const waitTime = endTime.getTime() - now.getTime();

			if (waitTime <= 0) {
				// End time has already passed
				clearInterval(interval);
				console.log("Time's up! We have reached the end time.");
				resolve();
			} else {
				// Output remaining time in seconds
				console.log(
					`Remaining time: ${(waitTime / 1000).toFixed(1)} seconds`
				);
			}
		}, 1000); // Check every second
	});
}

async function createAMACIRound(
	client: RegistryClient,
	operator: string,
	title: string,
	start_voting: Date,
	end_voting: Date,
	maxVoter: string,
	maxOption: string,
	whitelist: Whitelist,
	circuitType: string
) {
	const start_time = (start_voting.getTime() * 10 ** 6).toString();
	const end_time = (end_voting.getTime() * 10 ** 6).toString();
	// console.log(start_time, end_time);
	// const start_time = '1726070400000000000';
	// const end_time = '1757606400000000000';

	const res = await client.createRound(
		{
			operator,
			preDeactivateRoot: '0',
			voiceCreditAmount: '40',
			whitelist,
			roundInfo: {
				// title: 'Embracing the Uncertainty: A Journey Through Life's Unexpected Twists and Hidden Opportunities',
				// title: 'new contract 2-1-1-5 qv with wrong stateIdx: user1: 10, user2: 15',
				// title: 'new contract 4-2-2-25 1p1v with deactivate msg',
				title,
				description:
					'Life is often compared to a winding road, filled with unexpected turns and hidden challenges. Along this journey, we encounter moments that test our resolve and shape our character. Every step forward, no matter how small, brings us closer to our true purpose. In these quiet, often unnoticed moments, growth happens, and the strength we never knew we had emerges. As we continue down this path, the beauty lies not in the destination, but in the journey itself—the people we meet, the lessons we learn, and the stories we create along the way.',
				link: 'https://www.google.com',
			},
			votingTime: {
				start_time,
				end_time,
			},
			maxVoter,
			maxOption,
			certificationSystem: '0',
			// circuitType: '0',
			circuitType,
		},
		'auto',
		undefined,
		[
			{
				denom: 'peaka',
				amount: '200000000000000000000',
			},
		]
	);
	let contractAddress = '';
	res.events.map(event => {
		if (event.type === 'wasm') {
			let actionEvent = event.attributes.find(
				attr => attr.key === 'action'
			)!;
			if (actionEvent.value === 'created_round') {
				contractAddress = event.attributes
					.find(attr => attr.key === 'round_addr')!
					.value.toString();
			}
		}
	});
	console.log(`Deploy tx: ${res.transactionHash} - ${contractAddress}`);
	return contractAddress;
}

export async function batchSend(signerAddress: string, recipients: string[], amount_per_voter: string) {
	const batchSize = 1500;
	let client = await getSignerClient();

	const amount = coins(amount_per_voter, 'peaka');

	const gasPrice = GasPrice.fromString('100000000000peaka');

	for (let i = 0; i < recipients.length; i += batchSize) {
		const batchRecipients = recipients.slice(i, i + batchSize);
		let msgs: MsgSendEncodeObject[] = batchRecipients.map(recipient => {
			return {
				typeUrl: '/cosmos.bank.v1beta1.MsgSend',
				value: {
					fromAddress: signerAddress,
					toAddress: recipient,
					amount: amount,
				},
			};
		});

		const fee = calculateFee(50000 * msgs.length, gasPrice);
		const result = await client.signAndBroadcast(signerAddress, msgs, fee);
		console.log(`Faucet tx: ${result.transactionHash}`);
	}
}

export async function batchSendBig(recipients: string[]) {
	const batchSize = 1500;
	let client = await getSignerClient();

	const amount = coins('100000000000000000000', 'peaka'); // 50

	const gasPrice = GasPrice.fromString('100000000000peaka');

	for (let i = 0; i < recipients.length; i += batchSize) {
		const batchRecipients = recipients.slice(i, i + batchSize);
		let msgs: MsgSendEncodeObject[] = batchRecipients.map(recipient => {
			return {
				typeUrl: '/cosmos.bank.v1beta1.MsgSend',
				value: {
					fromAddress: signerAddress,
					toAddress: recipient,
					amount: amount,
				},
			};
		});

		const fee = calculateFee(50000 * msgs.length, gasPrice);
		const result = await client.signAndBroadcast(signerAddress, msgs, fee);
		console.log(`Faucet tx: ${result.transactionHash}`);
	}
}

export async function randomSubmitMsg(
	client: SigningCosmWasmClient,
	contractAddress: string,
	address: string,
	stateIdx: number,
	maciAccount: Account,
	coordPubKey: PublicKey
) {

	// 给每个项目投5票，一个voter投5个项目，所以是20票


	// 4-2-2-25 1p1v    25个option
	// 4-2-2-25 1p1v    25个option
	const plan = [
		[0, 1] as [number, number],
		[1, 1] as [number, number],
		[2, 1] as [number, number],
		[3, 1] as [number, number],
		[4, 1] as [number, number],
		[5, 1] as [number, number],
		[6, 1] as [number, number],
		[7, 1] as [number, number],
		[8, 1] as [number, number],
		[9, 1] as [number, number],
		[10, 1] as [number, number],
		[11, 1] as [number, number],
		[12, 1] as [number, number],
		[13, 1] as [number, number],
		[14, 1] as [number, number],
		[15, 1] as [number, number],
		[16, 1] as [number, number],
		[17, 1] as [number, number],
		[18, 1] as [number, number],
		[19, 1] as [number, number],
		[20, 1] as [number, number],
		[21, 1] as [number, number],
		[22, 1] as [number, number],
		[23, 1] as [number, number],
		[24, 1] as [number, number],
	];

	const payload = batchGenMessage(stateIdx, maciAccount, coordPubKey, plan);

	const msgs: MsgExecuteContractEncodeObject[] = payload.map(
		({ msg, encPubkeys }) => ({
			typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
			value: MsgExecuteContract.fromPartial({
				sender: address,
				contract: contractAddress,
				msg: new TextEncoder().encode(
					JSON.stringify(
						stringizing({
							publish_message: {
								enc_pub_key: {
									x: encPubkeys[0],
									y: encPubkeys[1],
								},
								message: {
									data: msg,
								},
							},
						})
					)
				),
			}),
		})
	);

	const gasPrice = GasPrice.fromString('100000000000peaka');
	const fee = calculateFee(20000000 * msgs.length, gasPrice);
	try {
		const currentHeight = await client.getHeight();
		const timeoutHeight = BigInt(currentHeight) + BigInt(4); // 假设每个区块5秒,4个区块大约20秒

		const result = await client.signAndBroadcast(
			address,
			msgs,
			fee,
			undefined,
			timeoutHeight
		);

		console.log(stateIdx, `pub_msg hash ${result.transactionHash}`);
		return result;
	} catch (err) {
		// 将 err 类型显式地转换为 Error
		if (err instanceof Error) {
			if (
				err.message.includes(
					'You might want to check later. There was a wait of 16 seconds.'
				)
			) {
				console.log(err.message);
				console.log('skip this error and waiting 16s.');
				await delay(17000);
			} else {
				console.error('Unexpected error', err);

				throw err;
			}
		}
	}
}

export async function batchRevokeWithdraw(
	client: SigningCosmWasmClient,
	contractAddress: string,
	address: string
) {
	const msgs: MsgExecuteContractEncodeObject[] = [
		{
			typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
			value: MsgExecuteContract.fromPartial({
				sender: address,
				contract: contractAddress,
				msg: new TextEncoder().encode(
					JSON.stringify(
						stringizing({
							revoke: {},
						})
					)
				),
			}),
		},
		{
			typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
			value: MsgExecuteContract.fromPartial({
				sender: address,
				contract: contractAddress,
				msg: new TextEncoder().encode(
					JSON.stringify(
						stringizing({
							withdraw: {},
						})
					)
				),
			}),
		},
	];
	// const gasPrice = GasPrice.fromString('100000000000peaka');
	// const fee = calculateFee(20000000 * msgs.length, gasPrice);
	try {
		const result = await client.signAndBroadcast(address, msgs, 'auto');
		return result;
	} catch (err) {
		// 将 err 类型显式地转换为 Error
		if (err instanceof Error) {
			if (
				err.message.includes(
					'You might want to check later. There was a wait of 16 seconds.'
				)
			) {
				console.log(err.message);
				console.log('skip this error and waiting 16s.');
				await delay(17000);
			} else {
				console.error('Unexpected error', err);
				throw err;
			}
		}
	}
}

export async function randomSubmitDeactivateMsg(
	client: AMaciClient,
	stateIdx: number,
	maciAccount: Account,
	coordPubKey: PublicKey
) {
	let encAccount = genKeypair();

	const messages = genDeactivateMessage(
		stateIdx,
		maciAccount,
		encAccount,
		coordPubKey
	).map(message => {
		return message.toString();
	});

	try {
		const result = await client.publishDeactivateMessage({
			encPubKey: {
				x: encAccount.pubKey[0].toString(),
				y: encAccount.pubKey[1].toString(),
			},
			message: {
				data: messages as [
					string,
					string,
					string,
					string,
					string,
					string,
					string
				],
			},
		});

		console.log(
			stateIdx,
			`publish_deactivate_message hash ${result.transactionHash}`
		);
		return result;
	} catch (err) {
		// 将 err 类型显式地转换为 Error
		if (err instanceof Error) {
			if (
				err.message.includes(
					'You might want to check later. There was a wait of 16 seconds.'
				)
			) {
				console.log(err.message);
				console.log('skip this error and waiting 16s.');
				await delay(17000);
			} else {
				console.error('Unexpected error', err);

				throw err;
			}
		}
	}
}

/**
 * 批量测试函数，支持多用户投票
 * @param creator 创建者钱包
 * @param operator 操作者地址
 * @param voters 用户钱包数组
 * @param operatorPubkey 操作者公钥
 * @param end_voting 投票结束时间
 * @param skipUserOperation 是否跳过用户操作
 * @param title 投票轮次标题
 * @param skipDeactivate 是否跳过用户注销操作
 * @param circuitType 电路类型
 */
async function batch_2115_voter(
	creator: DirectSecp256k1HdWallet,
	operator: string,
	voters: DirectSecp256k1HdWallet[],
	operatorPubkey: string[],
	skipUserOperation: boolean,
	title: string,
	skipDeactivate: boolean,
	circuitType: string,
	voting_period: number
) {
	console.log(`当前有 ${voters.length} 个用户参与投票`);
	
	// 获取注册客户端
	let registryClient = await getRegistryClientBy(
		creator,
		registryContractAddress
	);

	const userAddresses: string[] = [];
	const userClients: SigningCosmWasmClient[] = [];
	const maciAccounts: Account[] = [];
	const userStateIndices: number[] = [];
	
	for (let i = 0; i < voters.length; i++) {
		const accountDetail = await voters[i].getAccounts();
		userAddresses.push(accountDetail[0].address);
		userClients.push(await getContractClientByWallet(voters[i]));
		maciAccounts.push(genKeypair());
	}

	const start_voting = new Date();
	const end_voting_re = new Date(start_voting.getTime() + voting_period * 60 * 1000);
	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);
	console.log(`End voting time: ${end_voting_re.toLocaleTimeString()}`);

	const coordPubKey: PublicKey = [
		BigInt(operatorPubkey[0]),
		BigInt(operatorPubkey[1]),
	];
	console.log('coordPubKey', coordPubKey);

	let contractAddress = '';
	while (!contractAddress) {
		try {
			// 准备白名单
			const whitelist = {
				users: userAddresses.map(addr => ({ addr }))
			};
			
			contractAddress = await createAMACIRound(
				registryClient,
				operator,
				title,
				start_voting,
				end_voting_re,
				voters.length.toString(), // 最大投票者数量
				'25',  // 最大选项数量
				whitelist,
				circuitType
			);
			console.log(`Contract deployed at: ${contractAddress}`);
		} catch (error) {
			console.log('Deploy failed, retrying...', error);
			await delay(16000);
		}
	}

	await delay(16000);

	if (skipUserOperation) {
		console.log('Skip user operation');
		return;
	}

	console.log('Start user operation');
	
	// 获取所有用户的MACI客户端
	const userMaciClients: AMaciClient[] = [];
	for (let i = 0; i < voters.length; i++) {
		userMaciClients.push(await getAMaciClientBy(voters[i], contractAddress));
	}

	try {
		let numSignUp = await userMaciClients[0].getNumSignUp();
		console.log(`Initial sign-ups: ${numSignUp}`);
		
		console.log("开始用户注册...");
		const gasPrice = GasPrice.fromString('100000000000peaka');
		const signUpFee = calculateFee(60000000, gasPrice);
		
		for (let i = 0; i < voters.length; i++) {
			try {
				const pubkey = {
					x: uint256FromDecimalString(maciAccounts[i].pubKey[0].toString()),
					y: uint256FromDecimalString(maciAccounts[i].pubKey[1].toString()),
				};
				
				const res = await userMaciClients[i].signUp({ pubkey }, signUpFee);
				console.log(`User${i + 1} signup hash: ${res.transactionHash}`);
				
                 // 每个用户操作后添加延迟
                console.log(`等待 6 秒后处理下一个用户...`);
                await delay(6000);
			} catch (err) {
				if (err instanceof Error) {
					if (err.message.includes('You might want to check later. There was a wait of 16 seconds.')) {
						console.log(`User${i + 1}: skip this error and waiting 17s.`);
						await delay(17000);
					} else if (err.message.includes('502') || err.message.includes('Bad Gateway')) {
						console.log(`服务器过载，等待 30 秒后重试...`);
						await delay(30000);
						i--; // 重试当前用户
						continue;
					} else if (err.message.includes('You might want to check later')) {
						console.log(`需要等待，延迟 20 秒...`);
						await delay(20000);
					} else {
						console.error(`User${i + 1} signup error:`, err);
						await delay(5000); // 即使是未知错误也添加延迟
					}
				}
			}
		}

		console.log("等待12s,确保交易被处理...");
		await delay(12000);
		
		console.log("获取用户状态索引...");
		
		for (let i = 0; i < voters.length; i++) {
				const stateIdx = await userMaciClients[i].signuped({
					pubkeyX: maciAccounts[i].pubKey[0].toString(),
				});
				console.log(`User${i + 1} state index: ${stateIdx}`);
				userStateIndices.push(Number(stateIdx) - 1);
		}
		
		if (!skipDeactivate) {
			console.log("开始用户deactive...");
			for (let i = 0; i < voters.length; i++) {
				try {
					await randomSubmitDeactivateMsg(
						userMaciClients[i],
						userStateIndices[i],
						maciAccounts[i],
						coordPubKey
					);
					console.log(`User${i + 1} deactivated`);
					
				    await delay(6000);
                    
				} catch (err) {
					console.error(`User${i + 1} deactivate error:`, err);
				}
			}
		}

		console.log("等待12s,确保交易被处理...");
		await delay(12000);
		
		console.log("这个测试没有用户投票...");
		
		console.log("All user operations completed");
		
	} catch (error) {
		console.error('Error during user operations:', error);
	}

	console.log("Test completed");
}

export async function amaciBenchmarkRoundsSyncExecute(roundNum: number, voterNum: number, voting_period: number, title: string) {
	let start = 0;
	let thread = 3 * roundNum - 1; // 3 multi - 1
	
	// 创建用户钱包
	const allVoters: DirectSecp256k1HdWallet[] = [];
	for (let i = 1; i <= voterNum; i++) {
		allVoters.push(await generateAccount(i));
	}
	
	let operatorList = [
		{
			operator: 'dora1zrd68hgj5uzqpm5x8v6pylwqjsnltp6nyr8s0k',
			pubkey: [
				'5424741844275630152950028819860276183538330999940395309613975245790840672621',
				'6821363586466624930174394695023126212730779300840339744873622125361194404156',
			],
		},
	];

	for (let i = start; i <= thread; i += 3) {
		// 创建者钱包
		let creator = await generateAccount(0);
		
		console.log(`---- Start Round: ${Math.floor(i/3) + 1} ----`);
		
		let skipDeactivate = false;
		let circuitType = '0'; // 1p1v

		console.log('This is deactive tests');
		
		await batch_2115_voter(
			creator,
			operatorList[0].operator,
			allVoters,
			operatorList[0].pubkey,
			false, // 不跳过用户操作
			title,
			skipDeactivate,
			circuitType,
			voting_period
		);
	}
}

