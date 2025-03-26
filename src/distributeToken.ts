import { batchSend } from './amaciregistrytestaround';

import { generateAccount } from './config';

/**
 * 主函数示例
 */
export async function distributeToken() {
  // 示例接收者地址列表
  const recipients: string[] = [];

  // 生成25个地址
  for (let i = 1; i <= 625; i++) {
    let signer = await generateAccount(i);
    let accountDetail = await signer.getAccounts();
    recipients.push(accountDetail[0].address);
  }

  let signer = await generateAccount(0);
  let accountDetail = await signer.getAccounts();
  await batchSend(accountDetail[0].address, recipients, "2000000000000000000000");
}
