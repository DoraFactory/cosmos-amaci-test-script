import * as fs from 'fs/promises';
import * as path from 'path';
import {
	getSignerClient,
	generateAccount,
	getSignerClientByWallet,
	signerAddress,
	getContractClient,
	contractAddress,
	getContractClientByWallet,
	defaultCoordPubKey,
	stringizing,
	getMaciClientByWallet,
	getMaciClientBy,
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
import { PublicKey, batchGenMessage } from './lib/circom';
import { MaciClient } from './ts/Maci.client';
import { Groth16ProofType, MessageData, PubKey } from './ts/Maci.types';

// const readFile = promisify(fs.readFile);

async function readFile(filePath: string) {
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		return data;
	} catch (err) {
		console.error('Error:', err);
	}
}

interface UserPubkeyData {
	pubkeys: string[][];
}

interface AMaciLogEntry {
	type: string;
	data: any;
}

interface PublishDeactivateMessageData {
	message: [string, string, string, string, string, string, string];
	encPubKey: string[];
}

interface ProofDeactivateData {
	size: string;
	newDeactivateCommitment: string;
	newDeactivateRoot: string;
}

interface ProofAddNewKeyData {
	pubKey: string[];
	d: string[];
	nullifier: string;
}

interface PublishMessageData {
	message: [string, string, string, string, string, string, string];
	encPubKey: string[];
}

interface ProcessMessageData {
	newStateCommitment: string;
}

interface ProcessTallyData {
	newTallyCommitment: string;
}

interface StopTallyingPeriodData {
	results: string[];
	salt: string;
}

function uint256FromDecimalString(decimalString: string) {
	return decimalString; // Placeholder for conversion logic
}

async function deployMACIContract(
	client: SigningCosmWasmClient,
	operatorPubkeyX: string,
	operatorPubkeyY: string,
	address: string,
	start_voting: Date,
	end_voting: Date
) {
	const start_time = (start_voting.getTime() * 10 ** 6).toString();
	const end_time = (end_voting.getTime() * 10 ** 6).toString();
	// return '';
	let res = await client.instantiate(
		address,
		32, // testnet maci code_id
		// 26, // mainnet maci code_id
		{
			round_info: { title: 'MACI Test Round', description: '', link: '' },
			voting_time: {
				start_time,
				end_time,
			},
			parameters: {
				state_tree_depth: '2',
				int_state_tree_depth: '1',
				message_batch_size: '5',
				vote_option_tree_depth: '1',
			},
			coordinator: {
				x: operatorPubkeyX,
				y: operatorPubkeyY,
			},
			groth16_process_vkey: {
				vk_alpha1:
					'2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926',
				vk_beta_2:
					'0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8',
				vk_gamma_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_delta_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_ic0: '11c73e3eccddd0c90cb720cdeeb65b963d0d22dddf5bcf757b3af079a20634ee2c8f6d3842473360a5789f2f4789eca681fef306fa9fa41fd3f421a980f42d95',
				vk_ic1: '0da9e2f1717602a155053a694523e95e691341f322037564323152ab45282d352d2971c68b718e85e1d9b4d37461e3b1df4dc1b15a37f35eaec1525d75fd6ab0',
			},
			qtr_lib: {
				zeros: [
					'0',
					'14655542659562014735865511769057053982292279840403315552050801315682099828156',
					'19261153649140605024552417994922546473530072875902678653210025980873274131905',
					'21526503558325068664033192388586640128492121680588893182274749683522508994597',
					'20017764101928005973906869479218555869286328459998999367935018992260318153770',
					'16998355316577652097112514691750893516081130026395813155204269482715045879598',
					'2612442706402737973181840577010736087708621987282725873936541279764292204086',
					'17716535433480122581515618850811568065658392066947958324371350481921422579201',
					'17437916409890180001398333108882255895598851862997171508841759030332444017770',
				],
			},
			groth16_tally_vkey: {
				vk_alpha1:
					'2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926',
				vk_beta_2:
					'0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8',
				vk_gamma_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_delta_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_ic0: '0b20a7584a8679cc6cf8e8cffc41ce9ad79c2cd0086214c3cb1af12146916bb9185b916c9938601b30c6fc4e7f2e1f1a7a94cb81e1774cb1f67b54eb33477e82',
				vk_ic1: '081919adecf04dd5e1c31a3e34f8907d2ca613df81f99b3aa56c5027cd6416c201ddf039c717b1d29ecc2381db6104506731132f624e60cc09675a100028de25',
			},
			plonk_process_vkey: null,
			plonk_tally_vkey: null,
			max_vote_options: '5',
			whitelist: null,
			circuit_type: '1',
			certification_system: '0',
		},
		'MACI',
		'auto'
	);
	console.log(`Deploy tx: ${res.transactionHash} - ${res.contractAddress} `);
	return res.contractAddress;
}

async function deployAMACIContract(
	client: SigningCosmWasmClient,
	operatorPubkeyX: string,
	operatorPubkeyY: string,
	address: string,
	start_voting: Date,
	end_voting: Date
) {
	const start_time = (start_voting.getTime() * 10 ** 6).toString();
	const end_time = (end_voting.getTime() * 10 ** 6).toString();
	// return '';
	let res = await client.instantiate(
		address,
		36, // testnet amaci code_id
		// 87, // mainnet amaci code_id
		{
			round_info: {
				title: 'AMACI Test Round',
				description: '',
				link: '',
			},
			voting_time: {
				start_time,
				end_time,
			},
			parameters: {
				state_tree_depth: '4',
				int_state_tree_depth: '2',
				message_batch_size: '25',
				vote_option_tree_depth: '2',
			},
			coordinator: {
				x: operatorPubkeyX,
				y: operatorPubkeyY,
			},
			groth16_process_vkey: {
				vk_alpha1:
					'2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926',
				vk_beta_2:
					'0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8',
				vk_gamma_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_delta_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_ic0: '2d24db3e5756bf9931a9a2a83094a8b9f19257e3d4ca7c31898d46d489f29e182ee64c470cee58fb8b57e64a1c9ad72e2e5237728f2890dbfe3ec5aba033c369',
				vk_ic1: '0ad3373a7f1e31c9d08b07e6c86823fe2edcc3eab00e4080d1541cab98af705608e62ee594ff26c5b08912bc7cfd18d3f2a4b619f028352da7db7584394d833a',
			},
			qtr_lib: {
				zeros: [
					'0',
					'14655542659562014735865511769057053982292279840403315552050801315682099828156',
					'19261153649140605024552417994922546473530072875902678653210025980873274131905',
					'21526503558325068664033192388586640128492121680588893182274749683522508994597',
					'20017764101928005973906869479218555869286328459998999367935018992260318153770',
					'16998355316577652097112514691750893516081130026395813155204269482715045879598',
					'2612442706402737973181840577010736087708621987282725873936541279764292204086',
					'17716535433480122581515618850811568065658392066947958324371350481921422579201',
					'17437916409890180001398333108882255895598851862997171508841759030332444017770',
				],
			},
			groth16_tally_vkey: {
				vk_alpha1:
					'2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926',
				vk_beta_2:
					'0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8',
				vk_gamma_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_delta_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_ic0: '0ea52cbde58120337cc92e98bae21083d0fd9bb04644c1cd9ff34a3e61a7eec00488120d2e24eb5fc0de14ab3490a35947ebc939385bea1f65fc6ab0bb9c9fc3',
				vk_ic1: '2b3ae8f64c57b5dc15daa78c1cc914737d45f18c5cb1e3829bebff818849c5a92223665f0add13bc82d0dfb1ea5e95be77929bb8ab0a811b26ad76295a8f8576',
			},
			groth16_deactivate_vkey: {
				vk_alpha1:
					'2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926',
				vk_beta_2:
					'0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8',
				vk_gamma_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_delta_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_ic0: '06afc565d68209383979b3839212f27768ec645880b709e28baecb9a549f0d8d29e0aeb5102b071bb983889b033e6401c593e3a780a6c2aa93aa7ff88741fe99',
				vk_ic1: '08612dd5d18e1e0fcc4b93731159563bf3f8eb6ba88b12195d8a0c07aac03ea412fbd4877d855888fddcb47956bbaf38ca33010f6406b8ace518f66d85740785',
			},
			groth16_add_key_vkey: {
				vk_alpha1:
					'2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926',
				vk_beta_2:
					'0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8',
				vk_gamma_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_delta_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_ic0: '2dbbb532c47e57c996a41c322bc54ac68b013ba0ff1771d5b70a4bc48531307812d75438820b13ef0535a5968d2b8b5b2d5e52cafe1c62276b1f4d6c83c49509',
				vk_ic1: '1003003b0c3c93ab80b2e37ee1b38f80a769445a49535fd86f86fb07b269073c1059f3de74eb805c960928de9d3cda4416c59dbe39a11f7e6fbbbd5c99e10bff',
			},
			max_vote_options: '25',
			whitelist: null,
		},
		'AMACI',
		'auto'
	);
	console.log(`Deploy tx: ${res.transactionHash} - ${res.contractAddress} `);
	return res.contractAddress;
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
	const plan = [
		[Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)] as [
			number,
			number
		],
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
	client: MaciClient,
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

async function testDeployContract(
	operator: DirectSecp256k1HdWallet,
	operatorPubkey: string[]
) {
	let operatorAddress = (await operator.getAccounts())[0].address;
	let operatorClient = await getContractClientByWallet(operator);

	const start_voting = new Date();
	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	const end_voting = new Date(start_voting.getTime() + 60 * 60 * 1000);
	console.log(`Time after 1 hours: ${end_voting.toLocaleTimeString()}`);

	let amaciContractAddress = '';
	while (!amaciContractAddress) {
		try {
			amaciContractAddress = await deployAMACIContract(
				operatorClient,
				operatorPubkey[0],
				operatorPubkey[1],
				operatorAddress,
				start_voting,
				end_voting
			);
		} catch (error) {
			console.log('amaci Deploy failed, retrying...', error);
			await delay(16000); // 延迟一段时间再重试
		}
	}
	console.log('amaci deploy success, contractAddress:', amaciContractAddress);

	let maciContractAddress = '';
	while (!maciContractAddress) {
		try {
			maciContractAddress = await deployMACIContract(
				operatorClient,
				operatorPubkey[0],
				operatorPubkey[1],
				operatorAddress,
				start_voting,
				end_voting
			);
		} catch (error) {
			console.log('maci contract Deploy failed, retrying...', error);
			await delay(16000); // 延迟一段时间再重试
		}
	}
	console.log('maci deploy success, contractAddress:', maciContractAddress);
}

export async function maciindexertest(roundNum: number) {
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

	let operatorList = [
		[
			'3557592161792765812904087712812111121909518311142005886657252371904276697771',
			'4363822302427519764561660537570341277214758164895027920046745209970137856681',
		],
		[
			'8446677751716569713622015905729882243875224951572887602730835165068040887285',
			'12484654491029393893324568717198080229359788322121893494118068510674758553628',
		],
		[
			'7169482574855732726427143738152492655331222726959638442902625038852449210076',
			'18313605050567479150590532619972444964205796585191616809522388018889233970802',
		],
	];

	for (let i = start; i <= thread; i += 3) {
		let operator = await generateAccount(0);
		let user1 = await generateAccount(1);
		let user2 = await generateAccount(2);
		// await delay(12000);
		console.log(`---- Start Round: ${i / 3} ----`);
		console.log(
			`${(i % (operatorList.length * 3)) / 3} operator pubkey: ${
				operatorList[(i % (operatorList.length * 3)) / 3]
			}`
		);

		await testDeployContract(
			operator,
			operatorList[(i % (operatorList.length * 3)) / 3]
		);
	}
}
