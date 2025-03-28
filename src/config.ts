import { Secp256k1HdWallet } from '@cosmjs/launchpad';
import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import {
	GasPrice,
	SigningStargateClient,
	SigningStargateClientOptions,
} from '@cosmjs/stargate';
import {
	SigningCosmWasmClient,
	SigningCosmWasmClientOptions,
} from '@cosmjs/cosmwasm-stargate';
import { HdPath, stringToPath } from '@cosmjs/crypto';
import { MaciClient } from './ts/Maci.client';
import { AMaciClient } from './ts/AMaci.client';
import * as dotenv from 'dotenv';
import { RegistryClient } from './ts/Registry.client';
dotenv.config();

// export const rpcEndpoint = 'https://vota-rpc.dorafactory.org';
// export const restEndpoint = 'https://vota-rest.dorafactory.org';
// export const apiEndpoint = 'https://vota-api.dorafactory.org';
// export const qfApiEndpoint = 'https://aez-api.dorafactory.org';
// export const chainId = 'vota-ash';

export const rpcEndpoint = 'https://vota-testnet-rpc.dorafactory.org';
export const restEndpoint = 'https://vota-testnet-rest.dorafactory.org';
export const apiEndpoint = 'https://vota-testnet-api.dorafactory.org';
export const qfApiEndpoint = 'https://aez-api.dorafactory.org';
export const chainId = 'vota-testnet';

// export const rpcEndpoint = 'http://127.0.0.1:26657';
// export const restEndpoint = 'http://127.0.0.1:1317';
// export const apiEndpoint = 'http://3.0.94.169:3000/';
// export const chainId = 'vota-testnet';

// export const rpcEndpoint = 'https://vota-sf-rpc.dorafactory.org/';
// export const restEndpoint = 'https://vota-sf-rest.dorafactory.org/';
// export const apiEndpoint = 'http://3.0.94.169:8000/';
// export const chainId = 'vota-sf';

export const prefix = 'dora';

// export const signerAddress = 'dora12c8lpjqrpjzlawx8g4xe873umy4e6vr5atqzhn';
export const signerAddress = 'dora149n5yhzgk5gex0eqmnnpnsxh6ys4exg5xyqjzm';
export const contractAddress =
	// 'dora1suhgf5svhu4usrurvxzlgn54ksxmn8gljarjtxqnapv8kjnp4nrscxqr5v';
	'dora1wdnc37yzmjvxksq89wdxwug0knuxau73ume3h6afngsmzsztsvwqggaxl2';

// export const defaultCoordPubKey = [
// 	7421895562686352826563669933550830041677218724210020561066263498415701325176n,
// 	15885728170420100812951141355295788125825926252169931895803773048587171524289n,
// ] as [bigint, bigint];

export const defaultCoordPubKey = [
	3557592161792765812904087712812111121909518311142005886657252371904276697771n,
	4363822302427519764561660537570341277214758164895027920046745209970137856681n,
] as [bigint, bigint];

export const registryContractAddress =
	'dora13c8aecstyxrhax9znvvh5zey89edrmd2k5va57pxvpe3fxtfsfeqlhsjnd';
// 'dora1smg5qp5trjdkcekdjssqpjehdjf6n4cjss0clyvqcud3t3u3948s8rmgg4';

/** Setting to speed up testing */
const defaultSigningClientOptions: SigningStargateClientOptions = {
	broadcastPollIntervalMs: 8_000,
	broadcastTimeoutMs: 64_000,
	gasPrice: GasPrice.fromString('100000000000peaka'),
};

export async function getSignerClient() {
	const mnemonic = process.env.MNEMONIC;

	if (mnemonic === undefined) {
		console.log('Missing MNEMONIC in .env');
		process.exit(0);
	}
	const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix,
	});
	const signingStargateClient = await SigningStargateClient.connectWithSigner(
		rpcEndpoint,
		wallet,
		{
			...defaultSigningClientOptions,
		}
	);
	return signingStargateClient;
}

export async function getContractClient() {
	const mnemonic = process.env.MNEMONIC;

	if (mnemonic === undefined) {
		console.log('Missing MNEMONIC in .env');
		process.exit(0);
	}
	const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix,
	});
	const client = await SigningCosmWasmClient.connectWithSigner(
		rpcEndpoint,
		wallet,
		{
			...defaultSigningClientOptions,
		}
	);
	return client;
}

export async function getMaciClient() {
	const contractAddress = process.env.CONTRACT_ADDRESS;
	const mnemonic = process.env.MNEMONIC;
	if (contractAddress === undefined) {
		console.log('Missing CONTRACT_ADDRESS in .env');
		process.exit(0);
	}

	if (mnemonic === undefined) {
		console.log('Missing MNEMONIC in .env');
		process.exit(0);
	}
	const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix,
	});

	const signingCosmWasmClient = await getContractClient();
	const [{ address }] = await wallet.getAccounts();
	return new MaciClient(signingCosmWasmClient, address, contractAddress);
}

export async function getMaciClientByWallet(wallet: DirectSecp256k1HdWallet) {
	const signingCosmWasmClient = await getContractClientByWallet(wallet);
	const [{ address }] = await wallet.getAccounts();
	return new MaciClient(signingCosmWasmClient, address, contractAddress);
}

export async function getMaciClientBy(
	wallet: DirectSecp256k1HdWallet,
	contractAddress: string
) {
	const signingCosmWasmClient = await getContractClientByWallet(wallet);
	const [{ address }] = await wallet.getAccounts();
	return new MaciClient(signingCosmWasmClient, address, contractAddress);
}

export async function getAMaciClient() {
	const contractAddress = process.env.CONTRACT_ADDRESS;
	const mnemonic = process.env.MNEMONIC;
	if (contractAddress === undefined) {
		console.log('Missing CONTRACT_ADDRESS in .env');
		process.exit(0);
	}

	if (mnemonic === undefined) {
		console.log('Missing MNEMONIC in .env');
		process.exit(0);
	}
	const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix,
	});

	const signingCosmWasmClient = await getContractClient();
	const [{ address }] = await wallet.getAccounts();
	return new AMaciClient(signingCosmWasmClient, address, contractAddress);
}

export async function getAMaciClientByWallet(wallet: DirectSecp256k1HdWallet) {
	const signingCosmWasmClient = await getContractClientByWallet(wallet);
	const [{ address }] = await wallet.getAccounts();
	return new AMaciClient(signingCosmWasmClient, address, contractAddress);
}

export async function getAMaciClientBy(
	wallet: DirectSecp256k1HdWallet,
	contractAddress: string
) {
	const signingCosmWasmClient = await getContractClientByWallet(wallet);
	const [{ address }] = await wallet.getAccounts();
	return new AMaciClient(signingCosmWasmClient, address, contractAddress);
}

export async function getRegistryClientBy(
	wallet: DirectSecp256k1HdWallet,
	contractAddress: string
) {
	const signingCosmWasmClient = await getContractClientByWallet(wallet);
	const [{ address }] = await wallet.getAccounts();
	return new RegistryClient(signingCosmWasmClient, address, contractAddress);
}

export async function getContractClientByWallet(
	wallet: DirectSecp256k1HdWallet
) {
	const client = await SigningCosmWasmClient.connectWithSigner(
		rpcEndpoint,
		wallet,
		{
			...defaultSigningClientOptions,
		}
	);
	return client;
}

export async function getSignerClientByWallet(wallet: DirectSecp256k1HdWallet) {
	const signingStargateClient = await SigningStargateClient.connectWithSigner(
		rpcEndpoint,
		wallet,
		{
			...defaultSigningClientOptions,
		}
	);
	return signingStargateClient;
}

export async function generateAccount(index: number) {
	const mnemonic = process.env.MNEMONIC;

	if (mnemonic === undefined) {
		console.log('Missing MNEMONIC in .env');
		process.exit(0);
	}

	const path: HdPath = stringToPath(
		"m/44'/" + '118' + "'/0'/0/" + index.toString()
	);
	const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix,
		hdPaths: [path],
	});

	return wallet;
	// return await DirectSecp256k1HdWallet.generate(24, { prefix });
}

type MixedData<T> = T | Array<MixedData<T>> | { [key: string]: MixedData<T> };

export const stringizing = (
	o: MixedData<bigint>,
	path: MixedData<bigint>[] = []
): MixedData<string> => {
	if (path.includes(o)) {
		throw new Error('loop nesting!');
	}
	const newPath = [...path, o];

	if (Array.isArray(o)) {
		return o.map(item => stringizing(item, newPath));
	} else if (typeof o === 'object') {
		const output: { [key: string]: MixedData<string> } = {};
		for (const key in o) {
			output[key] = stringizing(o[key], newPath);
		}
		return output;
	} else {
		return o.toString();
	}
};
