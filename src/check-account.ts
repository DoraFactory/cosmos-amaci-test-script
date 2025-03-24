import { decode, encode } from 'bech32';
import { Pubkey, pubkeyToAddress } from '@cosmjs/amino';
import { config } from 'dotenv';
import { ChainRestAuthApi, PublicKey } from '@injectivelabs/sdk-ts';

type Account = {
	account: {
		base_account: {
			pub_key: {
				key: string;
			};
		};
	};
};

async function convertToDoraVota(address: string) {
	const chainApi = `https://sentry.lcd.injective.network/cosmos/auth/v1beta1/accounts/${address}`;

	const accountData = await fetch(chainApi);
	const account = (await accountData.json()) as Account;
	console.log('account', account);
	if (!account.account.base_account.pub_key?.key) {
		console.log('No public key found');
		return;
	}

	const pubkey: Pubkey = {
		type: 'tendermint/PubKeySecp256k1',
		value: account.account.base_account.pub_key.key,
	};
	console.log('pubkey', pubkey);
	const doraAddress = pubkeyToAddress(pubkey, 'dora');
	// console.log('doraAddress', doraAddress);
	return doraAddress;
	// console.log(
	// 	'injectiveAddress',
	// 	PublicKey.fromBase64(account.account.base_account.pub_key.key || '')
	// 		.toAddress()
	// 		.toBech32()
	// );
}

function verifyIsBech32(address: string): Error | undefined {
	try {
		decode(address);
	} catch (error) {
		return error instanceof Error ? error : new Error('Unknown error');
	}

	return undefined;
}

function convertBech32Prefix(address: string, newPrefix: string): string {
	// Decode the original address
	const decoded = decode(address);

	// Encode the address with the new prefix
	const newAddress = encode(newPrefix, decoded.words);

	return newAddress;
}

export function isValidAddress(address: string): boolean {
	// An address is valid if it starts with `dora` and is Bech32 format.
	return address.startsWith('dora') && verifyIsBech32(address) === undefined;
}

async function convertToInjective(address: string) {
	const chainApi = new ChainRestAuthApi(
		'https://go.getblock.io/9bd81259f5ad45bc805f82cff210704d'
	);

	const cosmosAddress = address;
	const account = await chainApi.fetchCosmosAccount(cosmosAddress);

	if (!account.pub_key?.key) {
		console.log('No public key found');
		return;
	}
	console.log('cosmosAddress', cosmosAddress);
	console.log(
		'injectiveAddress',
		PublicKey.fromBase64(account.pub_key.key || '')
			.toAddress()
			.toBech32()
	);
}

async function main() {
	const addresses = [
		// 'cosmos1rlc5ha2xcfnts7f2tf8haauuzpm0nmvunkvuy7',
		'init1rlc5ha2xcfnts7f2tf8haauuzpm0nmvuaqv00u',
	];

	addresses.forEach(async address => {
		console.log(address, await convertBech32Prefix(address, 'cosmos'));
		// await convertToInjective(address);
	});
}

main();
