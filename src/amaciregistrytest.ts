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
	start_voting: Date,
	end_voting: Date,
	maxVoter: string,
	maxOption: string,
	whitelist: Whitelist
) {
	const start_time = (start_voting.getTime() * 10 ** 6).toString();
	const end_time = (end_voting.getTime() * 10 ** 6).toString();
	// console.log(start_time, end_time);
	// const start_time = '1726070400000000000';
	// const end_time = '1757606400000000000';

	const res = await client.createRound({
		operator,
		preDeactivateRoot: '0',
		voiceCreditAmount: '30',
		whitelist,
		roundInfo: {
			title: 'Embracing the Uncertainty: A Journey Through Life’s Unexpected Twists and Hidden Opportunities',
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
		circuitType: '0',
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

	const amount = coins('5000000000000000000000', 'peaka'); // 50

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
		[4, 10] as [number, number],
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
		const result = await client.signAndBroadcast(address, msgs, fee);

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
	skipUserOperation: boolean = true
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

	// const end_voting = new Date(start_voting.getTime() + 8 * 60 * 1000); // 1 小时
	console.log(`Time after 2 minutes: ${end_voting.toLocaleTimeString()}`);
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
	// try {
	// 	contractAddress = await deployContract(
	// 		operatorClient,
	// 		operatorPubkey[0],
	// 		operatorPubkey[1],
	// 		operatorAddress,
	// 		start_voting,
	// 		end_voting
	// 	);
	// } catch {}

	while (!contractAddress) {
		try {
			contractAddress = await createAMACIRound(
				registryClient,
				operator,
				start_voting,
				end_voting,
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
				}
			);
		} catch (error) {
			console.log('Deploy failed, retrying...', error);
			await delay(16000); // 延迟一段时间再重试
		}
	}
	// } catch {
	// 	console.log('deploy failed.');
	// }
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

			// let setVoteOptionsRes = await creatorMaciClient.setVoteOptionsMap({
			// 	voteOptionMap: [
			// 		'Research and Development of AI-Based Smart Home Device Management and Automation Control Systems',
			// 		'Optimization Platform for Efficient Data Transmission and Fault Tolerance in Large-Scale Distributed Computing',
			// 		'Application of Multi-Level User Behavior Analysis and Recommendation Algorithms in E-Commerce Platforms',
			// 		'Security Protocols and Compliance Research for Decentralized Financial Platforms Based on Blockchain Technology',
			// 		'Optimization of Low-Latency Real-Time Data Transmission and Edge Computing in Next-Generation Network Architecture',
			// 	],
			// });
			// console.log(
			// 	`creator set_vote_option hash: ${setVoteOptionsRes.transactionHash}`
			// );
			// await waitUntil(start_voting);
			// await delay(16000);

			try {
				let grant_res = await creatorMaciClient.grant({
					maxAmount: '100000000000000000000000',
				});
				console.log(`grant hash: ${grant_res.transactionHash}`);

				let bond_res = await creatorMaciClient.bond('auto', undefined, [
					{
						denom: 'peaka',
						amount: '1000000000000000000',
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
						maciAccount2.pubKey[0].toString()
					),
				};

				let user1_res = await user1MaciClient.signUp({
					pubkey: pubkey0,
				});
				console.log(`user1 signup hash: ${user1_res.transactionHash}`);

				let user2_res = await user2MaciClient.signUp({
					pubkey: pubkey1,
				});
				console.log(`user2 signup hash: ${user2_res.transactionHash}`);

				// await randomSubmitDeactivateMsg(
				// 	user1MaciClient,
				// 	0,
				// 	maciAccount1,
				// 	coordPubKey
				// );

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
			} catch (error) {
				console.error('Error start round:', error);
			}
		} else {
			process.exit;
		}
	}
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
	skipUserOperation: boolean = true
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

	const start_voting = new Date();

	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	// 增加10s
	// const end_voting = new Date(start_voting.getTime() + 30 * 60 * 1000); // 10s
	console.log(`Time after 2 minutes: ${end_voting.toLocaleTimeString()}`);

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
				start_voting,
				end_voting,
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
				}
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

				let pubkey0 = {
					x: uint256FromDecimalString(
						maciAccount1.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount1.pubKey[1].toString()
					),
				};
				let user1_res = await user1MaciClient.signUp({
					pubkey: pubkey0,
				});
				console.log(`user1 signup hash: ${user1_res.transactionHash}`);

				let pubkey1 = {
					x: uint256FromDecimalString(
						maciAccount2.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount2.pubKey[0].toString()
					),
				};
				let user2_res = await user2MaciClient.signUp({
					pubkey: pubkey1,
				});
				console.log(`user2 signup hash: ${user2_res.transactionHash}`);

				let pubkey2 = {
					x: uint256FromDecimalString(
						maciAccount3.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount3.pubKey[0].toString()
					),
				};
				let user3_res = await user3MaciClient.signUp({
					pubkey: pubkey2,
				});
				console.log(`user3 signup hash: ${user3_res.transactionHash}`);

				let pubkey3 = {
					x: uint256FromDecimalString(
						maciAccount4.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount4.pubKey[0].toString()
					),
				};
				let user4_res = await user4MaciClient.signUp({
					pubkey: pubkey3,
				});
				console.log(`user4 signup hash: ${user4_res.transactionHash}`);

				let pubkey4 = {
					x: uint256FromDecimalString(
						maciAccount5.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount5.pubKey[0].toString()
					),
				};
				let user5_res = await user5MaciClient.signUp({
					pubkey: pubkey4,
				});
				console.log(`user5 signup hash: ${user5_res.transactionHash}`);

				let pubkey5 = {
					x: uint256FromDecimalString(
						maciAccount6.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount6.pubKey[0].toString()
					),
				};
				let user6_res = await user6MaciClient.signUp({
					pubkey: pubkey5,
				});
				console.log(`user6 signup hash: ${user6_res.transactionHash}`);

				let pubkey6 = {
					x: uint256FromDecimalString(
						maciAccount7.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount7.pubKey[0].toString()
					),
				};
				let user7_res = await user7MaciClient.signUp({
					pubkey: pubkey6,
				});
				console.log(`user7 signup hash: ${user7_res.transactionHash}`);

				let pubkey7 = {
					x: uint256FromDecimalString(
						maciAccount8.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount8.pubKey[0].toString()
					),
				};
				let user8_res = await user8MaciClient.signUp({
					pubkey: pubkey7,
				});
				console.log(`user8 signup hash: ${user8_res.transactionHash}`);

				let pubkey8 = {
					x: uint256FromDecimalString(
						maciAccount9.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount9.pubKey[0].toString()
					),
				};
				let user9_res = await user9MaciClient.signUp({
					pubkey: pubkey8,
				});
				console.log(`user9 signup hash: ${user9_res.transactionHash}`);

				let pubkey9 = {
					x: uint256FromDecimalString(
						maciAccount10.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount10.pubKey[0].toString()
					),
				};
				let user10_res = await user10MaciClient.signUp({
					pubkey: pubkey9,
				});
				console.log(
					`user10 signup hash: ${user10_res.transactionHash}`
				);

				let pubkey10 = {
					x: uint256FromDecimalString(
						maciAccount11.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount11.pubKey[0].toString()
					),
				};
				let user11_res = await user11MaciClient.signUp({
					pubkey: pubkey10,
				});
				console.log(
					`user11 signup hash: ${user11_res.transactionHash}`
				);

				let pubkey11 = {
					x: uint256FromDecimalString(
						maciAccount12.pubKey[0].toString()
					),
					y: uint256FromDecimalString(
						maciAccount12.pubKey[0].toString()
					),
				};
				let user12_res = await user12MaciClient.signUp({
					pubkey: pubkey11,
				});
				console.log(
					`user12 signup hash: ${user12_res.transactionHash}`
				);

				// await randomSubmitDeactivateMsg(
				// 	user1MaciClient,
				// 	0,
				// 	maciAccount1,
				// 	coordPubKey
				// );

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
}

// async function testDeployContract(
// 	creator: DirectSecp256k1HdWallet,
// 	operator: string
// ) {
// 	let creatorAddress = (await creator.getAccounts())[0].address;
// 	let creatorClient = await getContractClientByWallet(creator);
// 	let registryClient = await getRegistryClientBy(
// 		creator,
// 		registryContractAddress
// 	);

// 	const start_voting = new Date();
// 	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

// 	const end_voting = new Date(start_voting.getTime() + 60 * 60 * 1000);
// 	console.log(`Time after 1 hours: ${end_voting.toLocaleTimeString()}`);

// 	let amaci2ContractAddress = '';
// 	while (!amaci2ContractAddress) {
// 		try {
// 			amaci2ContractAddress = await createAMACIRound(
// 				registryClient,
// 				operator,
// 				start_voting,
// 				end_voting,
// 				'5',
// 				'5'
// 			);
// 		} catch (error) {
// 			console.log('amaci Deploy failed, retrying...', error);
// 			await delay(16000); // 延迟一段时间再重试
// 		}
// 	}
// 	console.log(
// 		'amaci 2 deploy success, contractAddress:',
// 		amaci2ContractAddress
// 	);

// 	let amaci4ContractAddress = '';
// 	while (!amaci4ContractAddress) {
// 		try {
// 			amaci4ContractAddress = await createAMACIRound(
// 				registryClient,
// 				operator,
// 				start_voting,
// 				end_voting,
// 				'30',
// 				'6'
// 			);
// 		} catch (error) {
// 			console.log('maci contract Deploy failed, retrying...', error);
// 			await delay(16000); // 延迟一段时间再重试
// 		}
// 	}
// 	console.log(
// 		'amaci 4 deploy success, contractAddress:',
// 		amaci4ContractAddress
// 	);

// 	// let maciContractAddress = '';
// 	// while (!maciContractAddress) {
// 	// 	try {
// 	// 		maciContractAddress = await deployMACIContract(
// 	// 			operatorClient,
// 	// 			operatorPubkey[0],
// 	// 			operatorPubkey[1],
// 	// 			operatorAddress,
// 	// 			start_voting,
// 	// 			end_voting
// 	// 		);
// 	// 	} catch (error) {
// 	// 		console.log('maci contract Deploy failed, retrying...', error);
// 	// 		await delay(16000); // 延迟一段时间再重试
// 	// 	}
// 	// }
// 	// console.log('maci deploy success, contractAddress:', maciContractAddress);
// }

export async function amaciregistrytest(roundNum: number) {
	let accountAddresslist: string[] = [];
	let signerList: DirectSecp256k1HdWallet[] = [];
	let start = 0;
	// let roundNum = 1;
	let thread = 3 * roundNum - 1; // 3 multi - 1
	for (let i = start; i <= thread; i++) {
		let signer = await generateAccount(i);
		let accountDetail = await signer.getAccounts();
		accountAddresslist.push(accountDetail[0].address);
		signerList.push(signer);
	}

	// await batchSend(accountAddresslist);

	let operatorList = [
		// {
		// 	operator: 'dora15yfyalf872yut8cecy8p2j7rer9dd98rlg3xtq',
		// 	pubkey: [
		// 		'7421895562686352826563669933550830041677218724210020561066263498415701325176',
		// 		'15885728170420100812951141355295788125825926252169931895803773048587171524289',
		// 	],
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

	// for (let i = start; i <= thread; i += 3) {
	// 	let operator = await generateAccount(0);
	// 	let user1 = await generateAccount(1);
	// 	let user2 = await generateAccount(2);
	// 	// await delay(12000);
	// 	console.log(`---- Start Round: ${i / 3} ----`);
	// 	console.log(
	// 		`${(i % (operatorList.length * 3)) / 3} operator: ${
	// 			operatorList[(i % (operatorList.length * 3)) / 3]
	// 		}`
	// 	);

	// 	await testDeployContract(
	// 		operator,
	// 		operatorList[(i % (operatorList.length * 3)) / 3]
	// 	);
	// }
	const start_voting = new Date();
	const end_voting = new Date(start_voting.getTime() + 180 * 60 * 1000); // 10s

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

		// 根据当前批次选择不同的处理函数
		if ((i / 3) % 2 === 0) {
			console.log('test: amaci 2');
			await batch_2_amaci_test(
				creator,
				operatorList[(i % (operatorList.length * 3)) / 3].operator,
				user1,
				user2,
				operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
				end_voting,
				false
			);
		} else {
			console.log('test: amaci 4');
			console.log('skip amaci 4');
			await batch_4_amaci_test(
				creator,
				operatorList[(i % (operatorList.length * 3)) / 3].operator,
				user1,
				user2,
				user3,
				user4,
				user5,
				user6,
				user7,
				user8,
				user9,
				user10,
				user11,
				user12,
				operatorList[(i % (operatorList.length * 3)) / 3].pubkey,
				end_voting,
				false
			);
		}
	}
}
