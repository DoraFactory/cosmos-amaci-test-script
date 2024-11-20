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
import { bech32 } from 'bech32';
import { AMaciClient } from './ts/AMaci.client';
import { Groth16ProofType, MessageData, PubKey } from './ts/AMaci.types';
import { RegistryClient } from './ts/Registry.client';
import { Whitelist } from './ts/Registry.types';
import { PublicKey, batchGenMessage } from './lib/circom';
import { t } from 'tar';

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

	const res = await client.createRound({
		operator,
		preDeactivateRoot: '0',
		voiceCreditAmount: '40',
		whitelist,
		roundInfo: {
			// title: 'Embracing the Uncertainty: A Journey Through Life’s Unexpected Twists and Hidden Opportunities',
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
	});
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

export async function batchSend(recipients: string[]) {
	const batchSize = 1500;
	let client = await getSignerClient();

	const amount = coins('25000000000000000000', 'peaka'); // 25

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

	const amount = coins('300000000000000000000', 'peaka'); // 50

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
	/**
	 * 随机给一个项目投若干票
	 */
	// const plan = [
	// 	[Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)] as [
	// 		number,
	// 		number
	// 	],
	// ];
	const plan = [
		[1, 1] as [number, number],
		[2, 2] as [number, number],
		[3, 3] as [number, number],
		[4, 1] as [number, number],
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

export async function randomSubmitMsg2(
	client: SigningCosmWasmClient,
	contractAddress: string,
	address: string,
	stateIdx: number,
	maciAccount: Account,
	coordPubKey: PublicKey
) {
	/**
	 * 随机给一个项目投若干票
	 */
	// const plan = [
	// 	[Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)] as [
	// 		number,
	// 		number
	// 	],
	// ];
	const plan = [
		[0, 1] as [number, number],
		[2, 2] as [number, number],
		[3, 3] as [number, number],
		[4, 1] as [number, number],
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

async function batch_2_amaci_test(
	creator: DirectSecp256k1HdWallet,
	operator: string,
	user1: DirectSecp256k1HdWallet,
	user2: DirectSecp256k1HdWallet,
	operatorPubkey: string[],
	end_voting: Date,
	skipUserOperation: boolean,
	title: string,
	skipDeactivate: boolean,
	user1StateIdx: number,
	user2StateIdx: number,
	circuitType: string
) {
	const pubkeyFilePath = './src/test/user_pubkey.json';
	const logsFilePath = './src/test/user_logs.json';

	let registryClient = await getRegistryClientBy(
		creator,
		registryContractAddress
	);

	let creatorClient = await getContractClientByWallet(creator);

	let user1Address = (await user1.getAccounts())[0].address;
	let user2Address = (await user2.getAccounts())[0].address;
	let user1Client = await getContractClientByWallet(user1);
	let user2Client = await getContractClientByWallet(user2);

	let maciAccount1 = genKeypair();
	let maciAccount2 = genKeypair();

	const base_time = new Date();
	// const start_voting = new Date(base_time.getTime() + 2 * 60 * 1000); // 10 分钟
	const start_voting = new Date(base_time.getTime()); // 10 分钟

	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	const end_voting_re = new Date(start_voting.getTime() + 12 * 60 * 1000); // 1 小时
	console.log(`Time after 2 minutes: ${end_voting_re.toLocaleTimeString()}`);
	// const start_voting = new Date();

	// console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	// // 增加10s
	// const end_voting = new Date(start_voting.getTime() + 10 * 60 * 1000); // 10s
	// console.log(`Time after 2 minutes: ${end_voting.toLocaleTimeString()}`);

	let contractAddress = '';
	// try {
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
				'5',
				{
					users: [
						{
							addr: user1Address,
						},
						{
							addr: user2Address,
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

	await delay(16000);

	if (skipUserOperation === true) {
		console.log('skip user operation');
	} else {
		console.log('start user operation');
		if (contractAddress !== '') {
			let creatorMaciClient = await getAMaciClientBy(
				creator,
				contractAddress
			);
			let user1MaciClient = await getAMaciClientBy(
				user1,
				contractAddress
			);
			let user2MaciClient = await getAMaciClientBy(
				user2,
				contractAddress
			);

			try {
				let grant_res = await creatorMaciClient.grant({
					maxAmount: '100000000000000000000000',
				});
				console.log(`grant hash: ${grant_res.transactionHash}`);

				let bond_res = await creatorMaciClient.bond('auto', undefined, [
					{
						denom: 'peaka',
						amount: '7000000000000000000',
					},
				]);
				console.log(`bond hash: ${bond_res.transactionHash}`);

				let numSignUp = await user1MaciClient.getNumSignUp();
				console.log(`start num_sign_ups: ${numSignUp}`); // Expect 0
				await delay(500);

				let pubkey0 = {
					x: uint256FromDecimalString(
						maciAccount1.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount1.pubKey[1].toString()
					),
				};

				let pubkey1 = {
					x: uint256FromDecimalString(
						maciAccount2.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount2.pubKey[1].toString()
					),
				};
				try {
					const gasPrice = GasPrice.fromString('100000000000peaka');
					const signUpFee = calculateFee(60000000, gasPrice);

					const grantFee: StdFee = {
						amount: signUpFee.amount,
						gas: signUpFee.gas,
						granter: contractAddress,
					};

					let user1_res = await user1MaciClient.signUp(
						{
							pubkey: pubkey0,
						},
						grantFee
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

				try {
					let user2_res = await user2MaciClient.signUp({
						pubkey: pubkey1,
					});
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

				let user1_pubkey_state_idx = await user1MaciClient.signuped({
					pubkeyX: maciAccount1.pubKey[0].toString(),
				});
				console.log(
					`user1 pubkey state idx: ${user1_pubkey_state_idx}`
				);
				if (skipDeactivate === false) {
					await randomSubmitDeactivateMsg(
						user1MaciClient,
						Number(user1_pubkey_state_idx) - 1,
						maciAccount1,
						coordPubKey
					);
				}

				await randomSubmitMsg(
					user1Client,
					contractAddress,
					user1Address,
					user1StateIdx,
					// Number(user1_pubkey_state_idx) - 1,
					maciAccount1,
					coordPubKey
				);
				let user2_pubkey_state_idx = await user2MaciClient.signuped({
					pubkeyX: maciAccount2.pubKey[0].toString(),
				});
				console.log(
					`user2 pubkey state idx: ${user2_pubkey_state_idx}`
				);

				await randomSubmitMsg2(
					user2Client,
					contractAddress,
					user2Address,
					user2StateIdx,
					// Number(user2_pubkey_state_idx) - 1,
					maciAccount2,
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

async function batch_4_amaci_test(
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
	const pubkeyFilePath = './src/test/user_pubkey.json';
	const logsFilePath = './src/test/user_logs.json';

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
				const pubkeyContent = await readFile(pubkeyFilePath);
				const logsContent = await readFile(logsFilePath);

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

				await randomSubmitMsg2(
					user8Client,
					contractAddress,
					user8Address,
					7,
					maciAccount8,
					coordPubKey
				);

				await randomSubmitMsg2(
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

export async function amaciregistrytestround(roundNum: number) {
	let accountAddresslist: string[] = [];
	let signerList: DirectSecp256k1HdWallet[] = [];
	let start = 0;
	// let roundNum = 1;
	let thread = 3 * roundNum - 1; // 3 multi - 1
	for (let i = 1; i <= 13; i++) {
		let signer = await generateAccount(i);
		let accountDetail = await signer.getAccounts();
		accountAddresslist.push(accountDetail[0].address);
		signerList.push(signer);
	}

	// await batchSend(accountAddresslist);
	// await delay(10000);
	// await batchSendBig(accountAddresslist.slice(0, 2));
	// await delay(10000);

	let operatorList = [
		// {
		//      operator: 'dora15yfyalf872yut8cecy8p2j7rer9dd98rlg3xtq',
		//      pubkey: [
		//              '7421895562686352826563669933550830041677218724210020561066263498415701325176',
		//              '15885728170420100812951141355295788125825926252169931895803773048587171524289',
		//      ],
		// },

		{
			operator: 'dora149n5yhzgk5gex0eqmnnpnsxh6ys4exg5xyqjzm',
			pubkey: [
				'3457695696360848193502608246254422070002779638488733236214423797131720399296',
				'10721319678265866063861912417916780787229942812531198850410477756757845824096',
			],
		},
		{
			operator: 'dora1zrd68hgj5uzqpm5x8v6pylwqjsnltp6nyr8s0k',
			pubkey: [
				'5424741844275630152950028819860276183538330999940395309613975245790840672621',
				'6821363586466624930174394695023126212730779300840339744873622125361194404156',
			],
		},
		{
			operator: 'dora1k383vky62t85496xwp6qnalw5u2qj4tvsneluc',
			pubkey: [
				'339457423059495574326820494023899998621467676828017937021309840270576858799',
				'4138216818137880315912826301418122715579481744260360896824552739285524788661',
			],
		},
	];

	// let operatorList = [
	// 	// {
	// 	// 	operator: 'dora1cw3wf6lxddx498ga9v4jdrragf2zhjx455cku3',
	// 	// 	pubkey: [
	// 	// 		'4417857533698907802458937167572830658299030035842689506659910759118885164852',
	// 	// 		'18398139698235724775231612555438742459611017534174266711720047667402937434969',
	// 	// 	],
	// 	// },
	// 	// {
	// 	// 	operator: 'dora1j7yxvcynp95c9dwzzz78f5xlkj94xpt3mql2hq',
	// 	// 	pubkey: [
	// 	// 		'17369417334654652281073855690665607587368618936444350938621925111810050191392',
	// 	// 		'11116634654164812410195077865352436834368955827446872641119763763006362822345',
	// 	// 	],
	// 	// },
	// 	// {
	// 	// 	operator: 'dora14lst9pkx3mwlr3m0gxsrundflnsqkd27x27kmc',
	// 	// 	pubkey: [
	// 	// 		'19433940172816315444685116295647994756296924976491102058257283846008830173474',
	// 	// 		'15959567042037372324855002189850335378643391886048730588847287049569054991662',
	// 	// 	],
	// 	// },
	// 	// {
	// 	// 	operator: 'dora12ch7slkdtlk9fmm348qmfdclzeqw8ntrj3wq7c', // Citadel.one
	// 	// 	pubkey: [
	// 	// 		'6287930297913945282978887922669223325878689345894298410069300652806691204142',
	// 	// 		'1097175243062458227150725018049984303100392784363262430579271971998185183929',
	// 	// 	],
	// 	// },
	// 	{
	// 		operator: 'dora16nkezrnvw9fzqqqmmqtrdkw3pqes6qthhse2k4', // Dora Factory
	// 		pubkey: [
	// 			'1815360346961449660304628500630863783773328239515529681920310230078929610635',
	// 			'1543204810362218394850028913632376147290317641442164443830849121941234286792',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1zgkjgh2ylxnq7x3v5cws4e2tzszn34yy7tee6w', // Dora Ventures
	// 		pubkey: [
	// 			'10969241262411761017104078252396795671990154867469832050719006547208752421806',
	// 			'18442691397917891858727958831345150138795621884110620041478625337723969259353',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1nddnr2fjcupt3eher59mrp0cmwn52e4c98y4k5',
	// 		pubkey: [
	// 			'11043362857411207101295473092701542792077153813505230615881421921648274746246',
	// 			'3431336307758495332528815819065155244352578928861293932308944643929528727389',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1wwxceywj7ja3n035w0x94nsr4udyf4mw2jgyrr',
	// 		pubkey: [
	// 			'11978457659628044082619754133110456565484171271573638805501556808649565797391',
	// 			'17617391654650568936014542367907682392252640817518365969346802072098886141441',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1hghmu7zapyzzgnqxhqckzd0y00envqe9g2w2du',
	// 		pubkey: [
	// 			'17435182746053293007942830428304767502578289201180417325365913156635374538387',
	// 			'11099816916496136858818144201886975724812612212734072177889711695320139386392',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1zjzm7rwmum7p0vdvhyql8hstk3d8p8wxtd7rep',
	// 		pubkey: [
	// 			'20211487500471801899049648863556940225753211748448072695910082357606933345218',
	// 			'754988664436737478127212310497220463618756945220078784776032979093485613910',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1cq99fd447q8xdp8u99sdjuw7udzyhzpw5eg2d3',
	// 		pubkey: [
	// 			'1698921379599390399065843848651873934863165648052076964844264692772428470751',
	// 			'15172997820160411826967959117929439905605183535674057390659351412068202152356',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1ahu6cpk29rd2yqw3c53l0tjsc9w0q7xf5p9e8u',
	// 		pubkey: [
	// 			'4924348282548225552684197393994499100391152173243253655016296875428630196340',
	// 			'18465950528022514058363885629656919648755871361551640959680463154520937761720',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1mmz80knqzxal8pke747ty46nlaysvls7rw2yje',
	// 		pubkey: [
	// 			'11432490644815648309193414735260744748222413562660360907232756557595891488306',
	// 			'17837933442863038387726990400128196241219401479812161784932583056242445933808',
	// 		],
	// 	},
	// 	{
	// 		operator: 'dora1w8skpx06l5zmrp5pvj0fa49zcsnwhvtxyhfr8v', // ZKV
	// 		pubkey: [
	// 			'1447136561555038286186759509586332431076499146392616437011550399381420797094',
	// 			'4489922528030912429989527073875552800014544988121241929299373324515078932919',
	// 		],
	// 	},
	// ];

	const start_voting = new Date();
	const end_voting = new Date(start_voting.getTime() + 12 * 60 * 1000); // 10s

	for (let i = start; i <= thread; i += 3) {
		let creator = await generateAccount(0);
		let user1 = await generateAccount(1);
		let user2 = await generateAccount(2);
		let user3 = await generateAccount(3);
		let user4 = await generateAccount(4);
		let user5 = await generateAccount(5);
		let user6 = await generateAccount(6);
		let user7 = await generateAccount(7);
		let user8 = await generateAccount(8);
		let user9 = await generateAccount(9);
		let user10 = await generateAccount(10);
		let user11 = await generateAccount(11);
		let user12 = await generateAccount(12);

		// await delay(12000);
		console.log(`---- Start Round: ${i / 3} ----`);
		console.log(
			`${(i % (operatorList.length * 3)) / 3} operator: ${
				operatorList[(i % (operatorList.length * 3)) / 3].operator
			}`
		);

		// // console.log('test: amaci 2');
		let title = '2-1-1-5 1p1v with deactivate msg';
		let skipDeactivate = false;
		let user1StateIdx = 0;
		let user2StateIdx = 1;
		let circuitType = '0';
		await batch_2_amaci_test(
			creator,
			operatorList[(i % (operatorList.length * 3)) / 3].operator,
			user1,
			user2,
			operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
			end_voting,
			false,
			title,
			skipDeactivate,
			user1StateIdx,
			user2StateIdx,
			circuitType
		);

		// title = '2-1-1-5 1p1v';
		// skipDeactivate = true;
		// user1StateIdx = 0;
		// user2StateIdx = 1;
		// circuitType = '0';
		// await batch_2_amaci_test(
		// 	creator,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// 	user1,
		// 	user2,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// 	end_voting,
		// 	false,
		// 	title,
		// 	skipDeactivate,
		// 	user1StateIdx,
		// 	user2StateIdx,
		// 	circuitType
		// );

		// // // title: 'new contract 2-1-1-5 qv with wrong stateIdx: user1: 10, user2: 15',
		// // // title: 'new contract 4-2-2-25 1p1v with deactivate msg',
		// // title = '2-1-1-5 1p1v with wrong stateIdx: user1: 1, user2: 2';
		// // skipDeactivate = true;
		// // user1StateIdx = 1;
		// // user2StateIdx = 2;
		// // circuitType = '0';
		// // await batch_2_amaci_test(
		// // 	creator,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// // 	user1,
		// // 	user2,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// // 	end_voting,
		// // 	false,
		// // 	title,
		// // 	skipDeactivate,
		// // 	user1StateIdx,
		// // 	user2StateIdx,
		// // 	circuitType
		// // );

		// // title = '2-1-1-5 1p1v with wrong stateIdx: user1: 10, user2: 15';
		// // skipDeactivate = true;
		// // user1StateIdx = 10;
		// // user2StateIdx = 15;
		// // circuitType = '0';
		// // await batch_2_amaci_test(
		// // 	creator,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// // 	user1,
		// // 	user2,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// // 	end_voting,
		// // 	false,
		// // 	title,
		// // 	skipDeactivate,
		// // 	user1StateIdx,
		// // 	user2StateIdx,
		// // 	circuitType
		// // );

		title = '2-1-1-5 qv with deactivate msg';
		skipDeactivate = false;
		user1StateIdx = 0;
		user2StateIdx = 1;
		circuitType = '1';
		await batch_2_amaci_test(
			creator,
			operatorList[(i % (operatorList.length * 3)) / 3].operator,
			user1,
			user2,
			operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
			end_voting,
			false,
			title,
			skipDeactivate,
			user1StateIdx,
			user2StateIdx,
			circuitType
		);

		// title = '2-1-1-5 qv';
		// skipDeactivate = true;
		// user1StateIdx = 0;
		// user2StateIdx = 1;
		// circuitType = '1';
		// await batch_2_amaci_test(
		// 	creator,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// 	user1,
		// 	user2,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// 	end_voting,
		// 	false,
		// 	title,
		// 	skipDeactivate,
		// 	user1StateIdx,
		// 	user2StateIdx,
		// 	circuitType
		// );

		// // title = '2-1-1-5 qv with wrong stateIdx: user1: 1, user2: 2';
		// // skipDeactivate = true;
		// // user1StateIdx = 1;
		// // user2StateIdx = 2;
		// // circuitType = '1';
		// // await batch_2_amaci_test(
		// // 	creator,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// // 	user1,
		// // 	user2,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// // 	end_voting,
		// // 	false,
		// // 	title,
		// // 	skipDeactivate,
		// // 	user1StateIdx,
		// // 	user2StateIdx,
		// // 	circuitType
		// // );

		// // title = '2-1-1-5 qv with wrong stateIdx: user1: 10, user2: 15';
		// // skipDeactivate = true;
		// // user1StateIdx = 10;
		// // user2StateIdx = 15;
		// // circuitType = '1';
		// // await batch_2_amaci_test(
		// // 	creator,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// // 	user1,
		// // 	user2,
		// // 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// // 	end_voting,
		// // 	false,
		// // 	title,
		// // 	skipDeactivate,
		// // 	user1StateIdx,
		// // 	user2StateIdx,
		// // 	circuitType
		// // );

		// title = '4-2-2-25 qv with deactivate msg';
		// circuitType = '1';
		// await batch_4_amaci_test(
		// 	creator,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// 	user1,
		// 	user2,
		// 	user3,
		// 	user4,
		// 	user5,
		// 	user6,
		// 	user7,
		// 	user8,
		// 	user9,
		// 	user10,
		// 	user11,
		// 	user12,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// 	end_voting,
		// 	false,
		// 	title,
		// 	circuitType
		// );

		// title = '4-2-2-25 1p1v with deactivate msg';
		// circuitType = '0';
		// await batch_4_amaci_test(
		// 	creator,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// 	user1,
		// 	user2,
		// 	user3,
		// 	user4,
		// 	user5,
		// 	user6,
		// 	user7,
		// 	user8,
		// 	user9,
		// 	user10,
		// 	user11,
		// 	user12,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// 	end_voting,
		// 	false,
		// 	title,
		// 	circuitType
		// );

		// console.log('test: amaci 4');
		// await batch_4_amaci_test(
		// 	creator,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// 	user1,
		// 	user2,
		// 	user3,
		// 	user4,
		// 	user5,
		// 	user6,
		// 	user7,
		// 	user8,
		// 	user9,
		// 	user10,
		// 	user11,
		// 	user12,
		// 	operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// 	end_voting,
		// 	false
		// );

		// // 根据当前批次选择不同的处理函数
		// if ((i / 3) % 2 === 0) {
		// 	console.log('test: amaci 2');
		// 	await batch_2_amaci_test(
		// 		creator,
		// 		operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// 		user1,
		// 		user2,
		// 		operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// 		end_voting,
		// 		false
		// 	);
		// } else {
		// 	console.log('test: amaci 4');
		// 	console.log('skip amaci 4');
		// 	await batch_4_amaci_test(
		// 		creator,
		// 		operatorList[(i % (operatorList.length * 3)) / 3].operator,
		// 		user1,
		// 		user2,
		// 		user3,
		// 		user4,
		// 		user5,
		// 		user6,
		// 		user7,
		// 		user8,
		// 		user9,
		// 		user10,
		// 		user11,
		// 		user12,
		// 		operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
		// 		end_voting,
		// 		false
		// 	);
		// }
	}
}
