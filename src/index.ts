import {
	getSignerClient,
	generateAccount,
	getSignerClientByWallet,
	contractAddress,
	signerAddress,
	stringizing,
	getContractClient,
	defaultCoordPubKey,
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
import {
	MsgExecuteContractEncodeObject,
	SigningCosmWasmClient,
	ExecuteInstruction,
} from '@cosmjs/cosmwasm-stargate';
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { Account, PublicKey, batchGenMessage } from './lib/circom';
import { benchmarkTest } from './test';
import { amacitest } from './macitest';
import { amaciusertest } from './amaciusertest';
import { queryFunc } from './query';
import { maciindexertest } from './maciindexertest';
// import { amaciregistrytest } from './amaciregistrytest';
import { queryVoters } from './query-dora-account';
import { queryQfVoters } from './query-qf-account';
import { amaciregistrytestround } from './amaciregistrytestaround';
import { distributeToken } from './distributeToken';
import { amaciBenchmarkRoundsSyncExecute } from './amaci-test-round-sync';
import { amaciTestRoundAsyncExecute } from './amaci-test-rounds-async';

type DelegatorData = {
	id: number;
	delegator_address: string;
	amount: string;
	dora_address: string | undefined;
	credit_amount: number | undefined;
	airdrop_amount: number | undefined;
	update: Date;
};

export const delay = (ms: number) =>
	new Promise(resolve => setTimeout(resolve, ms));

// export async function grant(recipients: DelegatorData[]) {
// 	let client = await getContractClient();
// 	const users = recipients.map(recipient => {
// 		return {
// 			addr: recipient.dora_address!,
// 			balance: '50',
// 		};
// 	});
// 	try {
// 		let result = await client.execute(
// 			signerAddress,
// 			contractAddress,
// 			{
// 				grant: {
// 					base_amount: '50000000000000000000',
// 					whitelists: {
// 						users,
// 					},
// 				},
// 			},
// 			'auto'
// 		);
// 		console.log(`fee_grant tx: ${result.transactionHash}`);
// 	} catch (err) {
// 		// 将 err 类型显式地转换为 Error
// 		if (err instanceof Error) {
// 			if (
// 				err.message.includes(
// 					'You might want to check later. There was a wait of 16 seconds.'
// 				)
// 			) {
// 				console.log(err.message);
// 				console.log('skip this error and waiting 16s.');
// 				await delay(17000);
// 			} else {
// 				console.error('Unexpected error', err);

// 				throw err;
// 			}
// 		}
// 	}
// }

export async function batchSend(recipients: DelegatorData[]) {
	const batchSize = 1500;
	let client = await getSignerClient();

	const gasPrice = GasPrice.fromString('100000000000peaka');

	for (let i = 0; i < recipients.length; i += batchSize) {
		const batchRecipients = recipients.slice(i, i + batchSize);

		let msgs: MsgSendEncodeObject[] = batchRecipients.map(recipient => {
			return {
				typeUrl: '/cosmos.bank.v1beta1.MsgSend',
				value: {
					fromAddress: signerAddress,
					toAddress: recipient.dora_address!,
					amount: coins(
						(recipient.airdrop_amount! * 10 ** 18).toString(),
						'peaka'
					),
				},
			};
		});

		const fee = calculateFee(50000 * msgs.length, gasPrice);
		const result = await client.signAndBroadcast(signerAddress, msgs, fee);
		console.log(`Airdrop tx: ${result.transactionHash}`);
	}
}

// async function main() {
// 	await benchmarkTest(0, 10);
// }

async function main() {
	// await amaciusertest(170);
	// await amaciusertest(2);
	// await queryFunc();
	// await amacitest();
	// await maciindexertest(100);
	// 
	// await amaciregistrytestround(1);
	// await queryVoters();
	// await queryQfVoters();

	// await distributeToken();
	// no deactive 2115 3voter
	// 第一个数字代表一共跑几个round，第二个数字代表一共多少个用户参与vote,第三个数字代表voting_period(mins)
	// await amaciBenchmarkRoundsSyncExecute(1, 25, 20);
	await amaciTestRoundAsyncExecute(1, 5, 11);
}

main();
