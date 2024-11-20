import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// 读取并解析 CSV 文件
function readAddressesFromCsv(filePath: string): string[] {
	const fileContent = fs.readFileSync(filePath, 'utf-8');
	const records = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
	});

	// 提取地址列
	return records.map((record: any) => record.address);
}

// 主函数
function mergeAndDeduplicate() {
	try {
		// 读取两个文件中的地址
		const maciAddresses = readAddressesFromCsv('maci-voters.csv');
		const qfAddresses = readAddressesFromCsv('qf-voters.csv');
		const doraStakeAbove5000Addresses = readAddressesFromCsv(
			'delegators_stake_above_5000.csv'
		);

		// 定义 validator 账户地址
		const validatorAddresses = [
			'dora1tu8006g60t62zwgwf5knkaujv0uzhp2afcjnrg',
			'dora15frh0nn3v4yp3vv6sk4pn6jg9l8rt82fd29lqt',
			'dora1zzne8ufazycklx4j6mgc987t8ykd6wxu63223v',
			'dora1m9v3txhhtadjxpv09gwjhhs344qsxgfstcryqh',
			'dora1x5z0tkafrgyeuqkrwfjr933vghjxchqnnfjwm3',
			'dora1j8ru7p8zctup6grfwuga6ndrjj7v88wzqr2gsp',
			'dora12yk434ut3un4wx0rult2aww89rsrel8nydy83p',
			'dora1gh8j89jtc2vx6d3y4ehllcdlvluwa49wfs7yxy',
			'dora1l5zz0kkjt2n7nllsrymy96mc2v2gehdau5a3z0',
			'dora1z6kfew2nhuh02szc2hdecw4fqey2d32a02a62e',
			'dora1ddewp74vd2w8jhth2p0uazmc8ajgtcufz9wk7v',
			'dora14uz8dt79a03g8alr5qa56lgad6djcstvssnchh',
			'dora1gerunjnh6umehq6zm0gphrc87u37veuv8jqmq3',
			'dora1x3e7tlqa0zxw7qnasce36p5ncjeys3me2vaeqy',
		];

		// 合并地址并去重（第一档）
		const allAddresses = [
			...new Set([
				...maciAddresses,
				...qfAddresses,
				...doraStakeAbove5000Addresses,
				...validatorAddresses,
			]),
		];

		// 创建新的 CSV 内容
		const csvContent = 'address\n' + allAddresses.join('\n');

		// 写入新文件
		const outputPath = path.join(
			__dirname,
			'1-merged-unique-voters-with-delegators.csv'
		);
		fs.writeFileSync(outputPath, csvContent);

		console.log(`处理完成！共计 ${allAddresses.length} 个唯一地址`);
		console.log(`原始 MACI 地址数量: ${maciAddresses.length}`);
		console.log(`原始 QF 地址数量: ${qfAddresses.length}`);
		console.log(
			`原始 Dora 地址数量: ${doraStakeAbove5000Addresses.length}`
		);
		console.log(`输出文件保存在: ${outputPath}`);

		// 处理第二档地址
		const doraStakeBlow5000Addresses = readAddressesFromCsv(
			'delegators_stake_blow_5000.csv'
		);
		const secondTierAddresses = doraStakeBlow5000Addresses.filter(
			address => !allAddresses.includes(address)
		);

		// 创建第二档 CSV 内容
		const secondTierCsvContent =
			'address\n' + secondTierAddresses.join('\n');
		const secondTierOutputPath = path.join(
			__dirname,
			'2-delegators_stake_below_5000.csv'
		);
		fs.writeFileSync(secondTierOutputPath, secondTierCsvContent);

		console.log(
			`第二档处理完成！共计 ${secondTierAddresses.length} 个地址`
		);
		console.log(`输出文件保存在: ${secondTierOutputPath}`);
	} catch (error) {
		console.error('处理过程中发生错误:', error);
	}
}

// 执行程序
mergeAndDeduplicate();
