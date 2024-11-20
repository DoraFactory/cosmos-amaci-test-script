import requests
from fake_useragent import UserAgent
import random
import socket
import struct
import json
from pprint import pprint
from datetime import datetime
import csv


def fetch_html(url, headers={}, is_json=True, retry_count=5):
    ua_headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': "",  # 构造用户代理
        'Referer': 'https://www.google.com',
        'X-Forwarded-For': "",  # 构造
        'X-Real-IP': "",  # 构造
        'Connection': 'keep-alive',
    }
    ua = UserAgent()
    ip = socket.inet_ntoa(struct.pack('>I', random.randint(1, 0xffffffff)))
    ua_headers["User-Agent"] = ua.random
    ua_headers["X-Forwarded-For"] = ua_headers["X-Real-IP"] = ip
    ua_headers.update(headers)
    while retry_count > 0:
        try:
            html = requests.get(url, headers=ua_headers)
            # 使用代理访问
            return json.loads(html.text) if is_json else html.text
        except Exception:
            retry_count -= 1
    return None

quick_api = "https://vota-rest.dorafactory.org/"
validators_path = "/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED"
validator_path = "/cosmos/staking/v1beta1/validator/{}"
validator_delegators_path = "/cosmos/staking/v1beta1/validators/{}/delegations"


def list_validators_data():
    validators_api = quick_api + validators_path
    validators_list = []
    
    validators_data = None
    while validators_data == None:
        validators_data = fetch_html(validators_api)
        if validators_data == None:
            print('try waiting... 0')

    validators_list.extend(validators_data['validators'])
    while validators_data['pagination']['next_key'] != None:
        next_validators_api = validators_api + "&pagination.key=" + validators_data['pagination']['next_key']
        
        validators_data = None
        while validators_data == None:
            validators_data = fetch_html(next_validators_api)
            if validators_data == None:
                print('try waiting... 0')

        validators_list.extend(validators_data['validators'])
    # print(validators_data)
    
    # print(len(validators_list))
    return validators_list
    
def query_delegators(validator_address):
    validator_delegators_api = quick_api + validator_delegators_path.format(validator_address)
    print(validator_delegators_api)
    validator_delegators = None
    while validator_delegators == None:
        validator_delegators = fetch_html(validator_delegators_api)
        if validator_delegators == None:
            print('try waiting... 1')

    total = validator_delegators['pagination']['total']
    index_data = {}
    dup_list = []
    length = 0
    
    address_list_all = []
    
    # address_list_stake_blow_5000 = [] # 质押低于5000
    # address_list_stake_above_5000 = [] # 质押高于5000 >= 5000
    while True:
        print(f"当前页面数据数量: {len(validator_delegators['delegation_responses'])}")
        
        for delegator_data in validator_delegators['delegation_responses']:
            delegator_address = delegator_data['delegation']['delegator_address']
            amount = delegator_data['balance']['amount']
            update = datetime.now()
            
            length += 1
            print(str(length) + "/" + str(total), update, delegator_address, amount)
            
            if (index_data.get(delegator_address) != None):
                print("!!!!!!!!!!!!!!!!!⬆️  重复")
                dup_list.append(delegator_address)
                index_data[delegator_address] += 1
            else:
                index_data[delegator_address] = 1
            address_list_all.append({
                'address': delegator_address,
                'amount': amount,
            })
            # print(delegator_address)
            # print(amount)
            # print(int(amount))
            # address_list_all.append(delegator_address)
            # if int(amount) < 5000*10**18:
            #     address_list_stake_blow_5000.append(delegator_address)
            # else:
            #     address_list_stake_above_5000.append(delegator_address)
            
        # 将重复记录的写入移到这里，每一页处理完后就写入
        if dup_list:
            file_name = "dup_log.txt"
            with open(file_name, 'a') as file:
                for item in dup_list:
                    file.write(f"{item}\n")
            dup_list = []  # 清空列表，避免重复写入
            
        if validator_delegators['pagination']['next_key'] is None:
            print(f"已处理完所有数据，总计: {length}/{total}")
            break
            
        next_key = validator_delegators['pagination']['next_key'].replace("+", "/")
        next_validator_delegators_api = validator_delegators_api + "?pagination.key=" + next_key
        print(next_validator_delegators_api)
        
        validator_delegators = None
        while validator_delegators == None:
            validator_delegators = fetch_html(next_validator_delegators_api)
            if validator_delegators == None:
                print('try waiting... 2')

    return address_list_all
if __name__ == "__main__":
    validators_data = list_validators_data()
    print(len(validators_data))
    print(validators_data)
    delegators_list_all = []
    for validator in validators_data:
        delegators_all = query_delegators(validator_address=validator['operator_address'])
        delegators_list_all.extend(delegators_all)
    stake_summary = {}
    for delegator in delegators_list_all:
        # 假设每个delegator都有一个stake数量的属性
        stake_amount = delegator.get('amount', 0)  # 获取质押数量，默认为0
        if delegator['address'] in stake_summary:
            stake_summary[delegator['address']] += int(stake_amount)  # 累加质押数量
        else:
            stake_summary[delegator['address']] = int(stake_amount)  # 初始化质押数量

    # 打印每个delegator的质押数量
    for address, total_stake in stake_summary.items():
        print(f"Delegator: {address}, Total Stake: {total_stake}")
        
    delegators_list_stake_blow_5000, delegators_list_stake_above_5000 = [], []
    for address, total_stake in stake_summary.items():
        if int(total_stake) < 5000*10**18:
            delegators_list_stake_blow_5000.append(address)
        else:
            delegators_list_stake_above_5000.append(address)
    # print(len(delegators_list_all))

    with open('delegators_stake_blow_5000.csv', mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['address'])  # 写入表头
        for delegator in delegators_list_stake_blow_5000:
            writer.writerow([delegator])  # 写入去重后的地址

    with open('delegators_stake_above_5000.csv', mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['address'])  # 写入表头
        for delegator in delegators_list_stake_above_5000:
            writer.writerow([delegator])  # 写入去重后的地址
