import chalk from 'chalk';
import { apiEndpoint } from './config';

interface SignUpEvent {
	id: string;
	blockHeight: string;
	timestamp: string;
	txHash: string;
	stateIdx: number;
	pubKey: string;
	balance: string;
	contractAddress: string;
}

interface PublishMessageEvent {
	id: string;
	blockHeight: string;
	timestamp: string;
	txHash: string;
	msgChainLength: number;
	message: string;
	encPubKey: string;
	contractAddress: string;
}

interface RoundData {
	id: string;
	blockHeight: string;
	txHash: string;
	operator: string;
	contractAddress: string;
	circuitName: string;
	timestamp: string;
	votingStart: string;
	votingEnd: string;
	status: string;
	period: string;
	actionType: string;
	roundId: string;
	roundTitle: string;
	roundDescription: string;
	roundLink: string;
	coordinatorPubkeyX: string;
	coordinatorPubkeyY: string;
	voteOptionMap: string;
	results: string;
	allResult: string;
	maciDenom: string;
	gasStationEnable: boolean;
	totalGrant: string;
	baseGrant: string;
	totalBond: string;
	circuitType: string;
	circuitPower: string;
	certificationSystem: string;
}

interface RoundsData {
	data: {
		rounds: {
			totalCount: number;
		};
	};
}

export async function getContractLogs(coordinatorPubkeyX: string) {
	const NOT_CLOSED_ROUND_QUERY = `query {
    rounds(first: 100, offset: 0, filter: {
			coordinatorPubkeyX: { 
			  equalTo: "${coordinatorPubkeyX}" 
			},
      status: {
        notEqualTo: "Closed"
      }
		  }){
    totalCount
    }
  }
`;

	let round_data: RoundsData = (await fetch(apiEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({ query: NOT_CLOSED_ROUND_QUERY }),
	}).then(res => res.json())) as RoundsData;

	const ROUND_QUERY = `query {
        rounds(first: 100, offset: 0, filter: {
                coordinatorPubkeyX: { 
                  equalTo: "${coordinatorPubkeyX}" 
                },
              }){
        totalCount
        }
      }
    `;

	let all_round_data: RoundsData = (await fetch(apiEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({ query: ROUND_QUERY }),
	}).then(res => res.json())) as RoundsData;

	const CLOSED_ROUND_QUERY = `query {
        rounds(first: 100, offset: 0, filter: {
                coordinatorPubkeyX: { 
                  equalTo: "${coordinatorPubkeyX}" 
                },
          status: {
            equalTo: "Closed"
          }
              }){
        totalCount
        }
      }
    `;

	let closed_round_data: RoundsData = (await fetch(apiEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({ query: CLOSED_ROUND_QUERY }),
	}).then(res => res.json())) as RoundsData;

	let unFinishCount = round_data.data.rounds.totalCount;
	let closedCount = closed_round_data.data.rounds.totalCount;
	let allRoundCount = all_round_data.data.rounds.totalCount;
	console.log(`${coordinatorPubkeyX}`);
	console.log(`finished: ${closedCount} / ${allRoundCount}`);
	console.log(`unfinished: ${unFinishCount} / ${allRoundCount}`);
	console.log('');
}

export async function queryFunc() {
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
	for (let i = 0; i < operatorList.length; i++) {
		await getContractLogs(operatorList[i][0]);
	}
}
