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
				amount: '50000000000000000000',
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
	const plan = [
		[0, 1] as [number, number],
		[1, 2] as [number, number],
		[2, 3] as [number, number],
		[3, 4] as [number, number],
		[4, 5] as [number, number],
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
				'25', // 最大投票者数量
				'5',  // 最大选项数量
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
				
			} catch (err) {
				if (err instanceof Error) {
					if (err.message.includes('You might want to check later. There was a wait of 16 seconds.')) {
						console.log(`User${i + 1}: skip this error and waiting 17s.`);
						await delay(17000);
					} else {
						console.error(`User${i + 1} signup error:`, err);
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
			console.log("开始用户注销...");
			for (let i = 0; i < voters.length; i++) {
				try {
					await randomSubmitDeactivateMsg(
						userMaciClients[i],
						userStateIndices[i],
						maciAccounts[i],
						coordPubKey
					);
					console.log(`User${i + 1} deactivated`);
					

				} catch (err) {
					console.error(`User${i + 1} deactivate error:`, err);
				}
			}
		}

		console.log("等待12s,确保交易被处理...");
		await delay(12000);
		
		console.log("开始用户投票...");
		for (let i = 0; i < voters.length; i++) {
			try {
				await randomSubmitMsg(
					userClients[i],
					contractAddress,
					userAddresses[i],
					i,
					maciAccounts[i],
					coordPubKey
				);
				console.log(`User${i + 1} vote submitted`);
				
			} catch (err) {
				console.error(`User${i + 1} vote error:`, err);
			}
		}
		
		console.log("All user operations completed");
		
	} catch (error) {
		console.error('Error during user operations:', error);
	}

	console.log("Test completed");
}

async function batch_42225_voter(
	creator: DirectSecp256k1HdWallet,
	operator: string,
	user1: DirectSecp256k1HdWallet,
	user2: DirectSecp256k1HdWallet,
	user3: DirectSecp256k1HdWallet,
	user4: DirectSecp256k1HdWallet,
	user5: DirectSecp256k1HdWallet,
	user6: DirectSecp256k1HdWallet,
	user7: DirectSecp256k1HdWallet,
	user8: DirectSecp256k1HdWallet,
	user9: DirectSecp256k1HdWallet,
	user10: DirectSecp256k1HdWallet,
	user11: DirectSecp256k1HdWallet,
	user12: DirectSecp256k1HdWallet,
	operatorPubkey: string[],
	end_voting: Date,
	skipUserOperation: boolean = true,
	title: string,
	circuitType: string
) {
	let registryClient = await getRegistryClientBy(
		creator,
		registryContractAddress
	);
	let user1Address = (await user1.getAccounts())[0].address;
	let user2Address = (await user2.getAccounts())[0].address;
	let user3Address = (await user3.getAccounts())[0].address;
	let user4Address = (await user4.getAccounts())[0].address;
	let user5Address = (await user5.getAccounts())[0].address;
	let user6Address = (await user6.getAccounts())[0].address;
	let user7Address = (await user7.getAccounts())[0].address;
	let user8Address = (await user8.getAccounts())[0].address;
	let user9Address = (await user9.getAccounts())[0].address;
	let user10Address = (await user10.getAccounts())[0].address;
	let user11Address = (await user11.getAccounts())[0].address;
	let user12Address = (await user12.getAccounts())[0].address;
	let user1Client = await getContractClientByWallet(user1);
	let user2Client = await getContractClientByWallet(user2);
	let user3Client = await getContractClientByWallet(user3);
	let user4Client = await getContractClientByWallet(user4);
	let user5Client = await getContractClientByWallet(user5);
	let user6Client = await getContractClientByWallet(user6);
	let user7Client = await getContractClientByWallet(user7);
	let user8Client = await getContractClientByWallet(user8);
	let user9Client = await getContractClientByWallet(user9);
	let user10Client = await getContractClientByWallet(user10);
	let user11Client = await getContractClientByWallet(user11);
	let user12Client = await getContractClientByWallet(user12);

	let maciAccount1 = genKeypair();
	let maciAccount2 = genKeypair();
	let maciAccount3 = genKeypair();
	let maciAccount4 = genKeypair();
	let maciAccount5 = genKeypair();
	let maciAccount6 = genKeypair();
	let maciAccount7 = genKeypair();
	let maciAccount8 = genKeypair();
	let maciAccount9 = genKeypair();
	let maciAccount10 = genKeypair();
	let maciAccount11 = genKeypair();
	let maciAccount12 = genKeypair();

	// const start_voting = new Date();
	// console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	// // 增加2分钟
	// const end_voting = new Date(start_voting.getTime() + 60 * 60 * 1000);
	// console.log(`Time after 2 minutes: ${end_voting.toLocaleTimeString()}`);

	const base_time = new Date();
	// const start_voting = new Date(base_time.getTime() + 2 * 60 * 1000); // 10 分钟
	const start_voting = new Date(base_time.getTime()); // 10 分钟

	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	const end_voting_re = new Date(start_voting.getTime() + 30 * 60 * 1000); // 1 小时
	console.log(`Time after 2 minutes: ${end_voting_re.toLocaleTimeString()}`);
	// 增加10s
	// const end_voting = new Date(start_voting.getTime() + 30 * 60 * 1000); // 10s
	console.log(`Time after 2 minutes: ${end_voting_re.toLocaleTimeString()}`);

	let contractAddress = '';
	const coordPubKey: PublicKey = [
		BigInt(operatorPubkey[0]),
		BigInt(operatorPubkey[1]),
	];
	console.log('coordPubKey', coordPubKey);

	while (!contractAddress) {
		try {
			contractAddress = await createAMACIRound(
				registryClient,
				operator,
				title,
				start_voting,
				end_voting_re,
				'5',
				'6',
				{
					users: [
						{
							addr: user1Address,
						},
						{
							addr: user2Address,
						},
						{
							addr: user3Address,
						},
						{
							addr: user4Address,
						},
						{
							addr: user5Address,
						},
						{
							addr: user6Address,
						},
						{
							addr: user7Address,
						},
						{
							addr: user8Address,
						},
						{
							addr: user9Address,
						},
						{
							addr: user10Address,
						},
						{
							addr: user11Address,
						},
						{
							addr: user12Address,
						},
					],
				},
				circuitType
			);
		} catch (error) {
			console.log('Deploy failed, retrying...', error);
			await delay(16000); // 延迟一段时间再重试
		}
	}
	if (skipUserOperation === true) {
		console.log('skip user operation');
	} else {
		console.log('start user operation');
		if (contractAddress !== '') {
			let user1MaciClient = await getAMaciClientBy(
				user1,
				contractAddress
			);
			let user2MaciClient = await getAMaciClientBy(
				user2,
				contractAddress
			);
			let user3MaciClient = await getAMaciClientBy(
				user3,
				contractAddress
			);
			let user4MaciClient = await getAMaciClientBy(
				user4,
				contractAddress
			);
			let user5MaciClient = await getAMaciClientBy(
				user5,
				contractAddress
			);
			let user6MaciClient = await getAMaciClientBy(
				user6,
				contractAddress
			);
			let user7MaciClient = await getAMaciClientBy(
				user7,
				contractAddress
			);
			let user8MaciClient = await getAMaciClientBy(
				user8,
				contractAddress
			);
			let user9MaciClient = await getAMaciClientBy(
				user9,
				contractAddress
			);
			let user10MaciClient = await getAMaciClientBy(
				user10,
				contractAddress
			);
			let user11MaciClient = await getAMaciClientBy(
				user11,
				contractAddress
			);
			let user12MaciClient = await getAMaciClientBy(
				user12,
				contractAddress
			);

			try {

				let numSignUp = await user1MaciClient.getNumSignUp();
				console.log(`start num_sign_ups: ${numSignUp}`); // Expect 0
				await delay(500);

				const gasPrice = GasPrice.fromString('100000000000peaka');
				const fee = calculateFee(39000000, gasPrice);



				let pubkey0 = {
					x: uint256FromDecimalString(
						maciAccount1.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount1.pubKey[1].toString()
					),
				};
				try {
					let user1_res = await user1MaciClient.signUp(
						{
							pubkey: pubkey0,
						},
						fee
					);
					console.log(
						`user1 signup hash: ${user1_res.transactionHash}`
					);
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

				let pubkey1 = {
					x: uint256FromDecimalString(
						maciAccount2.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount2.pubKey[1].toString()
					),
				};
				try {
					let user2_res = await user2MaciClient.signUp(
						{
							pubkey: pubkey1,
						},
						fee
					);
					console.log(
						`user2 signup hash: ${user2_res.transactionHash}`
					);
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

				let pubkey2 = {
					x: uint256FromDecimalString(
						maciAccount3.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount3.pubKey[1].toString()
					),
				};
				try {
					let user3_res = await user3MaciClient.signUp(
						{
							pubkey: pubkey2,
						},
						fee
					);
					console.log(
						`user3 signup hash: ${user3_res.transactionHash}`
					);
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

				let pubkey3 = {
					x: uint256FromDecimalString(
						maciAccount4.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount4.pubKey[1].toString()
					),
				};
				try {
					let user4_res = await user4MaciClient.signUp(
						{
							pubkey: pubkey3,
						},
						fee
					);
					console.log(
						`user4 signup hash: ${user4_res.transactionHash}`
					);
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

				let pubkey4 = {
					x: uint256FromDecimalString(
						maciAccount5.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount5.pubKey[1].toString()
					),
				};
				try {
					let user5_res = await user5MaciClient.signUp(
						{
							pubkey: pubkey4,
						},
						fee
					);
					console.log(
						`user5 signup hash: ${user5_res.transactionHash}`
					);
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

				let pubkey5 = {
					x: uint256FromDecimalString(
						maciAccount6.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount6.pubKey[1].toString()
					),
				};
				try {
					let user6_res = await user6MaciClient.signUp(
						{
							pubkey: pubkey5,
						},
						fee
					);
					console.log(
						`user6 signup hash: ${user6_res.transactionHash}`
					);
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

				let pubkey6 = {
					x: uint256FromDecimalString(
						maciAccount7.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount7.pubKey[1].toString()
					),
				};
				try {
					let user7_res = await user7MaciClient.signUp(
						{
							pubkey: pubkey6,
						},
						fee
					);
					console.log(
						`user7 signup hash: ${user7_res.transactionHash}`
					);
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

				let pubkey7 = {
					x: uint256FromDecimalString(
						maciAccount8.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount8.pubKey[1].toString()
					),
				};
				try {
					let user8_res = await user8MaciClient.signUp(
						{
							pubkey: pubkey7,
						},
						fee
					);
					console.log(
						`user8 signup hash: ${user8_res.transactionHash}`
					);
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

				let pubkey8 = {
					x: uint256FromDecimalString(
						maciAccount9.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount9.pubKey[1].toString()
					),
				};
				try {
					let user9_res = await user9MaciClient.signUp(
						{
							pubkey: pubkey8,
						},
						fee
					);
					console.log(
						`user9 signup hash: ${user9_res.transactionHash}`
					);
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

				let pubkey9 = {
					x: uint256FromDecimalString(
						maciAccount10.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount10.pubKey[1].toString()
					),
				};
				try {
					let user10_res = await user10MaciClient.signUp(
						{
							pubkey: pubkey9,
						},
						fee
					);
					console.log(
						`user10 signup hash: ${user10_res.transactionHash}`
					);
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

				let pubkey10 = {
					x: uint256FromDecimalString(
						maciAccount11.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount11.pubKey[1].toString()
					),
				};
				try {
					let user11_res = await user11MaciClient.signUp(
						{
							pubkey: pubkey10,
						},
						fee
					);
					console.log(
						`user11 signup hash: ${user11_res.transactionHash}`
					);
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

				let pubkey11 = {
					x: uint256FromDecimalString(
						maciAccount12.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount12.pubKey[1].toString()
					),
				};
				try {
					let user12_res = await user12MaciClient.signUp(
						{
							pubkey: pubkey11,
						},
						fee
					);
					console.log(
						`user12 signup hash: ${user12_res.transactionHash}`
					);
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

				await randomSubmitDeactivateMsg(
					user1MaciClient,
					0,
					maciAccount1,
					coordPubKey
				);

				await randomSubmitMsg(
					user1Client,
					contractAddress,
					user1Address,
					0,
					maciAccount1,
					coordPubKey
				);

				await randomSubmitMsg(
					user2Client,
					contractAddress,
					user2Address,
					1,
					maciAccount2,
					coordPubKey
				);

				await randomSubmitMsg(
					user3Client,
					contractAddress,
					user3Address,
					2,
					maciAccount3,
					coordPubKey
				);

				await randomSubmitMsg(
					user4Client,
					contractAddress,
					user4Address,
					3,
					maciAccount4,
					coordPubKey
				);

				await randomSubmitMsg(
					user5Client,
					contractAddress,
					user5Address,
					4,
					maciAccount5,
					coordPubKey
				);

				await randomSubmitMsg(
					user6Client,
					contractAddress,
					user6Address,
					5,
					maciAccount6,
					coordPubKey
				);

				await randomSubmitMsg(
					user7Client,
					contractAddress,
					user7Address,
					6,
					maciAccount7,
					coordPubKey
				);

				await randomSubmitMsg(
					user8Client,
					contractAddress,
					user8Address,
					7,
					maciAccount8,
					coordPubKey
				);

				await randomSubmitMsg(
					user9Client,
					contractAddress,
					user9Address,
					8,
					maciAccount9,
					coordPubKey
				);

				await randomSubmitMsg(
					user10Client,
					contractAddress,
					user10Address,
					9,
					maciAccount10,
					coordPubKey
				);

				await randomSubmitMsg(
					user11Client,
					contractAddress,
					user11Address,
					10,
					maciAccount11,
					coordPubKey
				);

				await randomSubmitMsg(
					user12Client,
					contractAddress,
					user12Address,
					11,
					maciAccount12,
					coordPubKey
				);
			} catch (error) {
				console.error('Error start round:', error);
			}
		} else {
			process.exit;
		}
	}

	await delay(16000);
}

export async function amaciBenchmarkRoundsSyncExecute(roundNum: number, voterNum: number, voting_period: number) {
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
		
		let title = '2-1-1-5 1p1v benchmark 3 voter no deactivate';
		let skipDeactivate = true;
		let circuitType = '0'; // 1p1v
		
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