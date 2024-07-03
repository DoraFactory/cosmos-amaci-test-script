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

async function deployContract(
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
		// 24, // nomal code id
		// 26, // have input log
		// 28,
		4,
		{
			round_info: { title: 'Test Round', description: '', link: '' },
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
			groth16_deactivate_vkey: {
				vk_alpha1:
					'2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926',
				vk_beta_2:
					'0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8',
				vk_gamma_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_delta_2:
					'198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
				vk_ic0: '28f5d5dc768e9fdea210b37950688ccf0154f0935839ac04a26d6abbba3084aa1d9c1e436742be0ab682a8353b34c900e1d9e66c17ec53cf44911a7658b612ce',
				vk_ic1: '054a83c112908ea4919d2f659f97db4f17db7a5afec9ed23471f5986e8b0ffbe03e8f971310d263bcee0827d37f294db3d0d2d87b841129382eac73e17169998',
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
				vk_ic0: '035433c392b9dc7b9726ee614df8405cbe501107477bda4637c4da5fa0d33d59281e15b37772d09c4d100eb944d31689ea72cae0b3571890e942f470cf197e71',
				vk_ic1: '07fff11b6419d3809632d17d5522ffd5c407c557d14942f84830af41fe4b460315ea9ca11ced4b807746de9b934057e586c24c3c8fe5081f2c368b167210d3d7',
			},
			max_vote_options: '5',
			whitelist: null,
			circuit_type: '0',
			voice_credit_amount: '100',
		},
		'Maci',
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

	const amount = coins('50000000000000000000', 'peaka'); // 50

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

async function batch_amaci_test(
	operator: DirectSecp256k1HdWallet,
	user1: DirectSecp256k1HdWallet,
	user2: DirectSecp256k1HdWallet,
	operatorPubkey: string[]
) {
	const pubkeyFilePath = './src/test/user_pubkey.json';
	const logsFilePath = './src/test/user_logs.json';

	// let operator = signerList[0];
	// let user1 = signerList[1];
	// let user2 = signerList[2];
	let operatorAddress = (await operator.getAccounts())[0].address;
	let user1Address = (await user1.getAccounts())[0].address;
	let user2Address = (await user2.getAccounts())[0].address;
	let operatorClient = await getContractClientByWallet(operator);
	let user1Client = await getContractClientByWallet(user1);
	let user2Client = await getContractClientByWallet(user2);

	let maciAccount1 = genKeypair();
	let maciAccount2 = genKeypair();

	const start_voting = new Date();
	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	// 增加2分钟
	const end_voting = new Date(start_voting.getTime() + 10 * 60 * 1000);
	console.log(`Time after 2 minutes: ${end_voting.toLocaleTimeString()}`);
	const waiting_voting = new Date(start_voting.getTime() + 10.5 * 60 * 1000);

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
			contractAddress = await deployContract(
				operatorClient,
				operatorPubkey[0],
				operatorPubkey[1],
				operatorAddress,
				start_voting,
				end_voting
			);
		} catch (error) {
			console.log('Deploy failed, retrying...', error);
			await delay(16000); // 延迟一段时间再重试
		}
	}
	// } catch {
	// 	console.log('deploy failed.');
	// }
	if (contractAddress !== '') {
		let operatorMaciClient = await getMaciClientBy(
			operator,
			contractAddress
		);
		let user1MaciClient = await getMaciClientBy(user1, contractAddress);
		let user2MaciClient = await getMaciClientBy(user2, contractAddress);

		try {
			const pubkeyContent = await readFile(pubkeyFilePath);
			const logsContent = await readFile(logsFilePath);

			let numSignUp = await operatorMaciClient.getNumSignUp();
			console.log(`start num_sign_ups: ${numSignUp}`); // Expect 0
			await delay(500);

			let pubkey0 = {
				x: uint256FromDecimalString(maciAccount1.pubKey[0].toString()),
				y: uint256FromDecimalString(maciAccount1.pubKey[1].toString()),
			};

			let pubkey1 = {
				x: uint256FromDecimalString(maciAccount2.pubKey[0].toString()),
				y: uint256FromDecimalString(maciAccount2.pubKey[0].toString()),
			};

			let user1_res = await user1MaciClient.signUp({ pubkey: pubkey0 });
			console.log(`user1 signup hash: ${user1_res.transactionHash}`);

			let user2_res = await user2MaciClient.signUp({ pubkey: pubkey1 });
			console.log(`user1 signup hash: ${user2_res.transactionHash}`);

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
		} catch (error) {
			console.error('Error start round:', error);
		}
	} else {
		process.exit;
	}
}

export async function amaciusertest(roundNum: number) {
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

	await batchSend(accountAddresslist);
	// let operatorList = [
	// 	[
	// 		'3557592161792765812904087712812111121909518311142005886657252371904276697771',
	// 		'4363822302427519764561660537570341277214758164895027920046745209970137856681',
	// 	],
	// 	// [
	// 	// 	'8446677751716569713622015905729882243875224951572887602730835165068040887285',
	// 	// 	'12484654491029393893324568717198080229359788322121893494118068510674758553628',
	// 	// ],
	// 	// [
	// 	// 	'7169482574855732726427143738152492655331222726959638442902625038852449210076',
	// 	// 	'18313605050567479150590532619972444964205796585191616809522388018889233970802',
	// 	// ],
	// ];

	let operatorList = [
		[
			'11308260996261200660037866315325367690628308704772641992106962270519774633030',
			'5396058820261492840859151628667614913777621413464907119701418895236946652856',
		],
		[
			'7156680637274630904178085043125678044341144161687390292642151738740800672379',
			'11745457780160124143225260733535069895858707750928000360439847780923712376393',
		],
		[
			'16081488432693639515223511565875952296047569168980063858129501240192584865173',
			'12267735922852515426551616233999432529880996968664389248908680961958115553527',
		],
		[
			'2959860152805685932748657604378672295634692618127051977496078485677467625519',
			'15034795930175784978851729238356332171089007323799012174066533135443258626919',
		],
		[
			'16797490719954162844626477862141035590403845199634438515638033939035001856535',
			'5707108651439659712536972094273699868332235372760973502040298321483199509633',
		],
		[
			'15886525942097418843105553307969116395801318047127840811578697489695946190683',
			'7147379789550255254788355027276061133179099081663719358018639675299362168646',
		],
		[
			'1205879897841782706307081041197757401941138607708035243294248150710142535890',
			'19132636584397764030080019146756319680768443050420396472798565550208558229275',
		],
		[
			'15849848964006450319190934534602881664662675790032633929116394731581938763142',
			'20344153551500074045610685473151977861523146762692017725843787277755390867193',
		],
		[
			'246393916215208529988871982123239618176290005437983136726171450356805834729',
			'6769913798241367737351699540720133845799790867219714987226242960254835988904',
		],
		[
			'20574320938812798263487555817980056323868339489906714119052655461159497541921',
			'16695344870043873613036900794349894468195570550877146293073448535255212758274',
		],
		[
			'413502615703162817709261384487859675540236085527001273496010128273954535461',
			'7024386254718570111948907734389866867944071031156609969350293658678253988786',
		],
		[
			'21274354668489959348029089405889490730575539512571208506943649307545986709733',
			'19853366151169465478812106145959054067576954756951131327572081872477018301523',
		],
		[
			'6695276358551526037428041308385161403034055439199967400721411832444201897746',
			'10505730754994540857286246707141637291610044172382676341543859775169555030704',
		],
		[
			'6260968612067188411158126299193980473017832886544656470366491764241058820355',
			'21697269958913831520532412328934457165843182454438559874047362186799188994406',
		],
		[
			'11048581935624647835736195311739172115754004932778122289679132355784317516809',
			'15731940614192025540900167288242769542663911295555797437240493548522535631952',
		],
		[
			'2891504614498776869467154425245373288851348740252435599308799055362528473932',
			'15672171211893486372674117621272992482412968960695399299667525372908467871522',
		],
	];
	for (let i = start; i <= thread; i += 3) {
		let operator = await generateAccount(i);
		let user1 = await generateAccount(i + 1);
		let user2 = await generateAccount(i + 2);
		// await delay(12000);
		console.log(`---- Start Round: ${i / 3} ----`);
		console.log(
			`${(i % (operatorList.length * 3)) / 3} operator pubkey: ${
				operatorList[(i % (operatorList.length * 3)) / 3]
			}`
		);
		await batch_amaci_test(
			operator,
			user1,
			user2,
			operatorList[(i % (operatorList.length * 3)) / 3]
		);
		// await delay(30000);
	}
}
