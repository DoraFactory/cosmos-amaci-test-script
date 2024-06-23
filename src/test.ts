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
import { bech32 } from 'bech32';
import { PublicKey, batchGenMessage } from './lib/circom';
import { MaciClient } from './ts/Maci.client';
import { Groth16ProofType, MessageData, PubKey } from './ts/Maci.types';

/**
 * 注册
 */
export async function signup(
	i: number,
	client: SigningCosmWasmClient,
	address: string,
	maciAccount: Account
) {
	const gasPrice = GasPrice.fromString('100000000000peaka');
	const fee = calculateFee(60000000, gasPrice);
	try {
		let res = await client.execute(
			address,
			contractAddress,
			{
				sign_up: {
					pubkey: {
						x: maciAccount.pubKey[0].toString(),
						y: maciAccount.pubKey[1].toString(),
					},
				},
			},
			fee
		);
		console.log(i, `signup hash ${res.transactionHash}`);
		return res;
	} catch (err: any) {
		console.log(err);
	}
}

export async function signUp(client: MaciClient, pubkey: PubKey) {
	const gasPrice = GasPrice.fromString('100000000000peaka');
	const fee = calculateFee(60000000, gasPrice);
	try {
		let res = await client.signUp({ pubkey }, fee);
		console.log(`sign_up hash ${res.transactionHash}`);
		return res;
	} catch (err: any) {
		console.log(err);
	}
}

/**
 * 投票
 */
export async function publishMessage(
	client: MaciClient,
	stateIdx: number,
	encPubKey: PubKey,
	message: MessageData
) {
	const gasPrice = GasPrice.fromString('100000000000peaka');
	const fee = calculateFee(20000000, gasPrice);
	try {
		const result = await client.publishMessage({ encPubKey, message }, fee);

		console.log(stateIdx, `pub_msg hash ${result.transactionHash}`);
		return result;
	} catch (err: any) {
		console.log(err);
		// await delay(16000);
	}
}

/**
 * Deactivate
 */
export async function publishDeactivateMessage(
	client: MaciClient,
	encPubKey: PubKey,
	message: MessageData
) {
	const gasPrice = GasPrice.fromString('100000000000peaka');
	const fee = calculateFee(20000000, gasPrice);
	try {
		const result = await client.publishDeactivateMessage(
			{ encPubKey, message },
			fee
		);

		console.log(`pub_deactivate_msg hash ${result.transactionHash}`);
		return result;
	} catch (err: any) {
		console.log(err);
		// await delay(16000);
	}
}

export async function processDeactivateMessage(
	client: MaciClient,
	groth16Proof: Groth16ProofType,
	newDeactivateCommitment: string,
	newDeactivateRoot: string,
	size: string
) {
	const gasPrice = GasPrice.fromString('100000000000peaka');
	const fee = calculateFee(60000000, gasPrice);
	try {
		let res = await client.processDeactivateMessage(
			{
				groth16Proof,
				newDeactivateCommitment,
				newDeactivateRoot,
				size,
			},
			fee
		);
		console.log(`process_deactivate_message hash ${res.transactionHash}`);
		return res;
	} catch (err: any) {
		console.log(err);
	}
}

export async function addNewKey(
	client: MaciClient,
	d: string[],
	groth16Proof: Groth16ProofType,
	nullifier: string,
	pubkey: PubKey
) {
	const gasPrice = GasPrice.fromString('100000000000peaka');
	const fee = calculateFee(60000000, gasPrice);
	try {
		let res = await client.addNewKey(
			{ d, groth16Proof, nullifier, pubkey },
			fee
		);
		console.log(`add_new_key hash ${res.transactionHash}`);
		return res;
	} catch (err: any) {
		console.log(err);
	}
}

/**
 * 投票
 */
export async function randomSubmitMsg(
	client: SigningCosmWasmClient,
	address: string,
	stateIdx: number,
	maciAccount: Account,
	coordPubKey: PublicKey = defaultCoordPubKey
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
	} catch (err: any) {
		console.log(err);
		// await delay(16000);
	}
}

export async function batchSend(recipients: string[]) {
	const batchSize = 1500;
	let client = await getSignerClient();

	const amount = coins('20000000000000000000', 'peaka'); // 20

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

		// await addWhitelist(batchRecipients);
	}
}

export async function testGrant(recipients: string[]) {
	const batchSize = 1500;

	for (let i = 0; i < recipients.length; i += batchSize) {
		const batchRecipients = recipients.slice(i, i + batchSize);
		await grant(batchRecipients);
	}
}

export async function grant(recipients: string[]) {
	let client = await getContractClient();
	const gasPrice = GasPrice.fromString('100000000000peaka');
	const users = recipients.map(recipient => {
		return {
			addr: recipient,
			balance: '50',
		};
	});
	let result = await client.execute(
		signerAddress,
		contractAddress,
		{
			grant: {
				base_amount: '50000000000000000000',
				whitelists: {
					users,
				},
			},
		},
		'auto'
	);
	console.log(`fee_grant tx: ${result.transactionHash}`);
}

export async function multiBatchSend(signer: DirectSecp256k1HdWallet[]) {
	// const recipient = "dora12xkk5rrk6ex2j0yt6kelsqs6yg4nghax7fq924";
	for (let i = 0; i < signer.length; i++) {
		// let signer_client = await getSignerClientByWallet(signer[i]);
		let client = await getContractClientByWallet(signer[i]);

		let [{ address }] = await signer[i].getAccounts();

		// let maciAccount = genKeypair();
		let maciAccount: Account = {
			privKey:
				20998112427667807795414983364053796027037753339446011285430200813389155550260n,
			pubKey: [
				18162874740989776649659415206015074611002004817349811277327337518639243679492n,
				15243585339587983598168692459942850229544616568356930224643892620924755850757n,
			],
			formatedPrivKey:
				6579145933965452350468879105197507094030383123583244552573447491276099023871n,
		};
		// console.log(maciAccount);
		console.log(i);
		// try {
		// 	signup(i, client, address, maciAccount);
		// } catch {}
		// await delay(16000);
		try {
			await delay(2000);
			randomSubmitMsg(client, address, i, maciAccount);
		} catch {}
		// let pub_msg = randomSubmitMsg(client, address, i, maciAccount);
		// console.log(i, `pub_msg hash ${pub_msg?.transactionHash}`);
	}
}

export async function benchmarkTest(start: number, thread: number) {
	// let thread = 10000;
	let accountAddresslist: string[] = [];
	let signerList: DirectSecp256k1HdWallet[] = [];
	// (start = 1), (thread = 100);
	for (let i = start; i <= thread; i++) {
		let signer = await generateAccount(i);
		let accountDetail = await signer.getAccounts();
		accountAddresslist.push(accountDetail[0].address);
		signerList.push(signer);
	}
	let operator = signerList[0];
	let user1 = signerList[1];
	let user2 = signerList[2];
	let operatorAddress = accountAddresslist[0];
	let user1Address = accountAddresslist[1];
	let user2Address = accountAddresslist[2];
	let operatorClient = await getContractClientByWallet(operator);
	let operatorMaciClient = await getMaciClientByWallet(operator);
	let user1Client = await getContractClientByWallet(user1);
	let user1MaciClient = await getMaciClientByWallet(user1);
	let user2Client = await getContractClientByWallet(user2);
	let user2MaciClient = await getMaciClientByWallet(user2);

	console.log(accountAddresslist);

	await batchSend(accountAddresslist);

	let user1Pubkey: PubKey = {
		x: '8446677751716569713622015905729882243875224951572887602730835165068040887285',
		y: '12484654491029393893324568717198080229359788322121893494118068510674758553628',
	};
	await signUp(user1MaciClient, user1Pubkey);

	let user2Pubkey: PubKey = {
		x: '4934845797881523927654842245387640257368309434525961062601274110069416343731',
		y: '7218132018004361008636029786293016526331813670637191622129869640055131468762',
	};
	await signUp(user2MaciClient, user2Pubkey);

	let deactivateMessage1: MessageData = {
		data: [
			'12464466727380559741327029120716347565653310312488492293821270525711683451322',
			'13309763630590930088453867560680909228282105989053894048998918693101765779139',
			'4484921303738698851059972318346660239747562407935541875738545702197977643459',
			'11866219424993283184335358483746244768886471962890428914681952211991059471133',
			'10251843967876693474360077990049981506696856835920530518366732065775811188590',
			'4376940093286634052723351995154669914406272562197264536135355413078576507865',
			'19451682690488021409271351267362522878278961921442674775643961510073401986424',
		],
	};
	let encPubkey1: PubKey = {
		x: '7169482574855732726427143738152492655331222726959638442902625038852449210076',
		y: '18313605050567479150590532619972444964205796585191616809522388018889233970802',
	};
	await publishDeactivateMessage(
		user2MaciClient,
		encPubkey1,
		deactivateMessage1
	);

	let deactivateMessage2: MessageData = {
		data: [
			'7747057536760136005430228262435826264866580124843536896813145526144814116982',
			'18328267626578854848326897321493160357703899589757355464037146322948839521936',
			'15302024921945581093264101479484122274672654005630938006953421086920203917576',
			'16644390621180328819121471049917891389532203684839145910292539858102955405675',
			'8418242452403936823096676468642419860420471132369414923867387559012728451588',
			'18263677130839387250588152560370157086590449719430612193901082763277953202797',
			'5739772208291299823265651034887637973778662912218986604352985098292640885288',
		],
	};
	let encPubkey2: PubKey = {
		x: '13895891042223842984354082723295984532606901725635480661500868013041641776581',
		y: '2455124196163095292891166406953801607702028315118548277145952282806422267751',
	};
	await publishDeactivateMessage(
		user2MaciClient,
		encPubkey2,
		deactivateMessage2
	);

	// await processDeactivateMessage(operatorMaciClient);

	const batchSize = 10;

	// for (let i = 0; i < signerList.length; i += batchSize) {
	// 	console.log(`--- ${i} / ${signerList.length}`);
	// 	const batchRecipients = signerList.slice(i, i + batchSize);
	// 	await multiBatchSend(batchRecipients);
	// 	await delay(1200);
	// }
}
