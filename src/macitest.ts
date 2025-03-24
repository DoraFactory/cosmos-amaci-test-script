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
import { genKeypair, Account } from './lib/circom';

import {
	MsgExecuteContractEncodeObject,
	SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate';
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx';
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
		2,
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
				x: '3557592161792765812904087712812111121909518311142005886657252371904276697771',
				y: '4363822302427519764561660537570341277214758164895027920046745209970137856681',
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

export async function amacitest() {
	let accountAddresslist: string[] = [];
	let signerList: DirectSecp256k1HdWallet[] = [];
	let start = 0;
	let roundNum = 1;
	let thread = 3 * roundNum - 1; // 3 multi - 1
	for (let i = start; i <= thread; i++) {
		let signer = await generateAccount(i);
		let accountDetail = await signer.getAccounts();
		accountAddresslist.push(accountDetail[0].address);
		signerList.push(signer);
	}

	await batchSend(accountAddresslist);

	for (let i = start; i <= thread; i += 3) {
		let operator = await generateAccount(i);
		let user1 = await generateAccount(i + 1);
		let user2 = await generateAccount(i + 2);
		await delay(12000);
		batch_amaci_test(operator, user1, user2);
	}
}

async function batch_amaci_test(
	operator: DirectSecp256k1HdWallet,
	user1: DirectSecp256k1HdWallet,
	user2: DirectSecp256k1HdWallet
) {
	const pubkeyFilePath = './src/test/user_pubkey.json';
	const logsFilePath = './src/test/logs.json';

	// let operator = signerList[0];
	// let user1 = signerList[1];
	// let user2 = signerList[2];
	let operatorAddress = (await operator.getAccounts())[0].address;
	let user1Address = (await user1.getAccounts())[0].address;
	let user2Address = (await user2.getAccounts())[0].address;
	let operatorClient = await getContractClientByWallet(operator);
	let user1Client = await getContractClientByWallet(user1);
	let user2Client = await getContractClientByWallet(user2);

	const start_voting = new Date();
	console.log(`Current time: ${start_voting.toLocaleTimeString()}`);

	// 增加2分钟
	const end_voting = new Date(start_voting.getTime() + 10 * 60 * 1000);
	console.log(`Time after 2 minutes: ${end_voting.toLocaleTimeString()}`);
	const waiting_voting = new Date(start_voting.getTime() + 10.5 * 60 * 1000);

	let contractAddress = '';
	// try {

	contractAddress = await deployContract(
		operatorClient,
		operatorAddress,
		start_voting,
		end_voting
	);
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
			const pubkeyData: UserPubkeyData = JSON.parse(pubkeyContent!);

			const logsContent = await readFile(logsFilePath);
			const logsData: AMaciLogEntry[] = JSON.parse(logsContent!);

			// operatorMaciClient.startVotingPeriod();
			// await delay(16000);

			let numSignUp = await operatorMaciClient.getNumSignUp();
			console.log(`start num_sign_ups: ${numSignUp}`); // Expect 0
			await delay(6000);

			let pubkey0 = {
				x: uint256FromDecimalString(pubkeyData.pubkeys[0][0]),
				y: uint256FromDecimalString(pubkeyData.pubkeys[0][1]),
			};

			let pubkey1 = {
				x: uint256FromDecimalString(pubkeyData.pubkeys[1][0]),
				y: uint256FromDecimalString(pubkeyData.pubkeys[1][1]),
			};

			let user1_res = await user1MaciClient.signUp({ pubkey: pubkey0 });
			console.log(user1_res.transactionHash);
			await delay(12000);

			let user2_res = await user2MaciClient.signUp({ pubkey: pubkey1 });
			console.log(user2_res.transactionHash);
			await delay(12000);
			numSignUp = await operatorMaciClient.getNumSignUp();
			console.log(`after signup num_sign_ups: ${numSignUp}`); // Expect 0

			for (let entry of logsData) {
				console.log(`---- ${contractAddress}: ${entry.type} ----`);
				switch (entry.type) {
					case 'publishDeactivateMessage':
						let deactivateData: PublishDeactivateMessageData =
							entry.data;

						let message: MessageData = {
							data: deactivateData.message,
						};

						let encPubKey: PubKey = {
							x: uint256FromDecimalString(
								deactivateData.encPubKey[0]
							),
							y: uint256FromDecimalString(
								deactivateData.encPubKey[1]
							),
						};

						let pub_dmsg_res =
							await user2MaciClient.publishDeactivateMessage({
								encPubKey,
								message,
							});
						console.log(
							`publish_deactiate_message tx: ${pub_dmsg_res.transactionHash}`
						);
						break;

					case 'proofDeactivate':
						let proofDeactivateData: ProofDeactivateData =
							entry.data;

						let size = uint256FromDecimalString(
							proofDeactivateData.size
						);
						let newDeactivateCommitment = uint256FromDecimalString(
							proofDeactivateData.newDeactivateCommitment
						);
						let newDeactivateRoot = uint256FromDecimalString(
							proofDeactivateData.newDeactivateRoot
						);
						let dMsgProof = {
							a: '07eb1d9b0b358b2e4fe5e051bfd67aa3e57e2ab2f64f10e35d396ffd250b43e50433ae33cf1f829a23b7f326d8d2e4ff947c6f9778b788cf98336a6596ca2d16',
							b: '0178e65e73c8e868900a5b439ac9c9f4c5dd7b1648b1f62bd5515a570fbf35a910fe35a737af956348436c2c62f046a08f35c0c7249bdaee25821122d1e3e11805f57494d28352120e88d1f75f560b3f15bea5af48d07e942df098b3e1aa95ff0a2541ae1aec50d71f30d01be5cd3d8a9d86ead1f190fb7d4c723bdcf9b11a51',
							c: '1e146ab4c5b7388f8207d8e00c8d44d63786eb9a2deb07674b9e47ecb263541b22109d09c11658954333b6e62dacca8a72c088ddd8ab633765bc46bf88e97cd8',
						};

						console.log(
							'process_deactivate_message proof',
							dMsgProof
						);
						console.log(
							'process_deactivate_message new commitment',
							newDeactivateCommitment
						);
						console.log(
							'process_deactivate_message new root',
							newDeactivateRoot
						);

						let process_dmsg_res =
							await operatorMaciClient.processDeactivateMessage({
								size,
								newDeactivateCommitment,
								newDeactivateRoot,
								groth16Proof: dMsgProof,
							});
						console.log(
							`process_deactiate_message tx: ${process_dmsg_res.transactionHash}`
						);

						break;

					case 'proofAddNewKey':
						let proofAddNewKeyData: ProofAddNewKeyData = entry.data;

						let pubkey = {
							x: uint256FromDecimalString(
								proofAddNewKeyData.pubKey[0]
							),
							y: uint256FromDecimalString(
								proofAddNewKeyData.pubKey[1]
							),
						};

						let d = proofAddNewKeyData.d.map(
							uint256FromDecimalString
						);
						let nullifier = uint256FromDecimalString(
							proofAddNewKeyData.nullifier
						);

						let newKeyProof = {
							a: '053eb9bf62de01898e5d7049bfeaee4611b78b54f516ff4b0fd93ffcdc491d8b170e2c3de370f8eeec93ebb57e49279adc68fb137f4aafe1b4206d7186592673',
							b: '2746ba15cb4478a1a90bd512844cd0e57070357ff17ad90964b699f962f4f24817ce4dcc89d350df5d63ae7f05f0069272c3d352cb92237e682222e68d52da0f00551f58de3a3cac33d6af2fb052e4ff4d42008b5f33b310756a5e7017919087284dc00b9753a3891872ee599467348976ec2d72703d46949a9b8093a97718eb',
							c: '1832b7d8607c041bd1437f43fe1d207ad64bea58f346cc91d0c72d9c02bbc4031decf433ecafc3874f4bcedbfae591caaf87834ad6867c7d342b96b6299ddd0a',
						};

						console.log('proof add new key proof', newKeyProof);
						console.log('proof add new key nullifier', nullifier);

						let add_new_key_res =
							await operatorMaciClient.addNewKey({
								d,
								groth16Proof: newKeyProof,
								nullifier,
								pubkey,
							});
						console.log(
							`add_new_key tx: ${add_new_key_res.transactionHash}`
						);
						break;

					case 'publishMessage':
						let publishMessageData: PublishMessageData = entry.data;

						let pubMsg = {
							data: publishMessageData.message,
						};

						let encPubMsg = {
							x: uint256FromDecimalString(
								publishMessageData.encPubKey[0]
							),
							y: uint256FromDecimalString(
								publishMessageData.encPubKey[1]
							),
						};

						let pub_msg_res = await user1MaciClient.publishMessage({
							encPubKey: encPubMsg,
							message: pubMsg,
						});

						console.log(
							`publish_message tx: ${pub_msg_res.transactionHash}`
						);
						break;

					case 'processMessage':
						await waitUntil(waiting_voting);

						let start_process_res =
							await operatorMaciClient.startProcessPeriod();

						console.log(
							`start_process_period tx: ${start_process_res.transactionHash}`
						);
						await delay(16000);

						let processMessageData: ProcessMessageData = entry.data;

						let newStateCommitment = uint256FromDecimalString(
							processMessageData.newStateCommitment
						);

						let processMsgProof = {
							a: '1064da3b6dc28c0c1cf5be19ae0d7e653cd6b4fd7fad60fbdf388358e3238a5106cdf7446c0e37a5421ffc98ca27e2ad7c39cbce6bd0828293a18903fb488b11',
							b: '269766a5e7a27980fa446543f84984ce60f8998f3518f74dff73d1b044323d4f22df42cb66facc4ce30d4e1937abe342cf8fda8d10134a4c21d60ab8ffabcc7029fcf2f5f4870f4d54d807cbd8cde9e4a2c2bc8740d6c63d835045145f1851470c8ba81d9639c83ecbecf5a4495238b4fcc7f8317388422c049dd7874b265b4b',
							c: '13e4c1882e33e250de25c916d469ef2fe99e2dfd2a89e2c2369ba348903d7bd40cd1b811de0b35c2b2ece3ac156e12cb1e1114819fbd37a670d0f588f4f30bab',
						};

						console.log(
							'proof process message proof',
							processMsgProof
						);
						console.log(
							'proof process message new state commitment',
							newStateCommitment
						);

						let process_msg_res =
							await operatorMaciClient.processMessage({
								groth16Proof: processMsgProof,
								newStateCommitment,
							});

						console.log(
							`process_message tx: ${process_msg_res.transactionHash}`
						);
						break;

					case 'processTally':
						let stop_process_res =
							await operatorMaciClient.stopProcessingPeriod();

						console.log(
							`stop_processing_period tx: ${stop_process_res.transactionHash}`
						);

						await delay(16000);
						let processTallyData: ProcessTallyData = entry.data;

						let newTallyCommitment = uint256FromDecimalString(
							processTallyData.newTallyCommitment
						);

						let processTallyProof = {
							a: '2223e53e3b01380cc92390be785006738a510e3f371b0ab255a4adc5a77839410537bc9546e50d1b634b45c8607c59d3ff905a64de8de75ea3f43b6b77a569be',
							b: '1786ccb676689ce648bcb5c9afba636d3bfb15b14c5333802f1006f9338f869a12e033e0a68484c04b9c6f8c6ee01d23a3cc78b13b86ab5282f14961f01f0b8212a89a503e8f2e652c5f00fceca6e1033df0904bb8626a2d6515bd44488e40e4211d1a7f6996e41ee46f81a762af3132174aa4725334783a493a432d1828db80',
							c: '1e53064534ff278b93ba9c2df8a8d2accac3358f7486072a605990e38544cc292cde5cf0b444f3395b627edeabf892ef3020b2b90edc3936bcef2caa6d68dbcb',
						};

						console.log(
							'proof process tally proof',
							processTallyProof
						);
						console.log(
							'proof process tally new tally commitment',
							newTallyCommitment
						);

						let process_tally_res =
							await operatorMaciClient.processTally({
								groth16Proof: processTallyProof,
								newTallyCommitment,
							});

						console.log(
							`process_tally tx: ${process_tally_res.transactionHash}`
						);
						break;

					case 'stopTallyingPeriod':
						let stopTallyingPeriodData: StopTallyingPeriodData =
							entry.data;

						let results = stopTallyingPeriodData.results.map(
							uint256FromDecimalString
						);
						let salt = uint256FromDecimalString(
							stopTallyingPeriodData.salt
						);

						console.log('results', results);
						console.log('salt', salt);

						let stop_tally_res =
							await operatorMaciClient.stopTallyingPeriod({
								results,
								salt,
							});
						console.log(
							`stop_tallying_period tx: ${stop_tally_res.transactionHash}`
						);
						break;

					default:
						console.log(`Unknown log type: ${entry.type}`);
				}
				await delay(16000);
			}
		} catch (error) {
			console.error('Error reading files:', error);
		}
	} else {
		process.exit;
	}
}
