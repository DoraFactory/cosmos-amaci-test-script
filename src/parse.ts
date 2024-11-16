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

		// 合并地址并去重
		const allAddresses = [...new Set([...maciAddresses, ...qfAddresses])];

		// 创建新的 CSV 内容
		const csvContent = 'address\n' + allAddresses.join('\n');

		// 写入新文件
		const outputPath = path.join(__dirname, 'merged-unique-voters.csv');
		fs.writeFileSync(outputPath, csvContent);

		console.log(`处理完成！共计 ${allAddresses.length} 个唯一地址`);
		console.log(`原始 MACI 地址数量: ${maciAddresses.length}`);
		console.log(`原始 QF 地址数量: ${qfAddresses.length}`);
		console.log(`输出文件保存在: ${outputPath}`);
	} catch (error) {
		console.error('处理过程中发生错误:', error);
	}
}

// 执行程序
mergeAndDeduplicate();
