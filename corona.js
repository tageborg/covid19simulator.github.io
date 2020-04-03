addEventListener("load", () => {

const isMobile = () => innerWidth < 1000;

const DEFAULTS = {
	"population": 10327589,
	"r0": 1.8,
	"avgInfectTime": 6,
	"mortalityWithCare": 0.5,
	"needRespirator": 2,
	"needIntubation": 4,
	"avgTimeToIntubation": 18,
	"avgTimeToRespirator": 20,
	"avgTimeToDeath": 22,
	"respirators": 570,
	"avgRespiratorDays": 3,
	"intubationSlots": 10000,
	"avgSurvivorIntubationDays": 2
};

const MAX_R0 = 10;

const sections = {
	generic: { label: 'Allmänt' },
	mortality: { label: 'Dödlighet och sjukvårdsbehov' },
	capacity: { label: 'Sjukvårdskapacitet' },
	time: { label: 'Genomsnittliga tider (dagar)' },
};

const inputs = {
	//days: { label: "Antal dagar", section: 'generic', isInteger: true },
	population: { label: "Befolkning", section: 'generic', isInteger: true, min: 1 },
	r0: { label: "Smittsamhet R0", section: 'generic', max: MAX_R0, step: 0.1 },
	deadNow: { label: "Döda hittils", section: 'generic', isInteger: true, allowNull: true },
	avgInfectTime: { label: "För att smitta annan", section: 'time', isInteger: true, min: 1 },
	mortalityWithCare: { label: "Dödlighet (%) med intensivvård", section: 'mortality' ,max: 100 },
	needRespirator: { label: "% som behöver respirator", section: 'mortality', max: 100 },
	needIntubation: { label: "% som enbart behöver syrgas", section: 'mortality', max: 100 },
	avgTimeToIntubation: { label: "Till syrgas", section: 'time', isInteger: true, min: 1  },
	avgTimeToRespirator: { label: "Till respirator", section: 'time', isInteger: true, min: 1  },
	avgTimeToDeath: { label: "Till död (med vård)", section: 'time', isInteger: true, min: 1  },
	respirators: { label: "Antal respiratorer", section: 'capacity', isInteger: true },
	avgRespiratorDays: { label: "Tid i respirator (överlevare)", section: 'time', isInteger: true, min: 1  },
	intubationSlots: { label: "Platser för syrgas", section: 'capacity', isInteger: true },
	avgSurvivorIntubationDays: { label: "Med syrgas (ej respirator-behov)", section: 'time', isInteger: true, min: 1  },
};

const metrics = {
	newDead: {
		label: "Döda per dag",
		finalize: (obj, prev) => Math.floor(obj.dead) - Math.floor(prev.dead),
	},
	newInfections: {
		label: "Smittade per dag",
		finalize: (obj, prev) => Math.floor(obj.infected) - Math.floor(prev.infected),
	},
	infected: { label: "Smittade från start" },
	dead: { label: "Döda från start" },
	enteredIntubationLight: { label: "Nya lätta fall med syrgas" },
	enteredIntubationHard: { label: "Nya svåra fall med syrgas" },
	enteredIntubationMortal: { label: "Nya dödstdömda fall med syrgas (nekade respirator)" },
	enteredRespirator: { label: "Nya i respirator" },
	respiratorsUsed: { label: "Respiratorer i användning" },
	intubatorsUsed: { label: "Personer med syrgas" },
	deadWithoutRespirator: { label: "Nya döda som nekats respirator" },
	deadWithoutHelp: { label: "Nya döda som nekats all vård" },
};

const selects = [
	{ defaultSelected: 'infected' },
	{ defaultSelected: 'dead' },
];

const actions = [
	{ color: 'green' },
	{ color: 'orange' },
	{ color: 'red' },
	{ color: 'blue' },
];

const selectId = (idx) => `selectMetric_${idx}`;
const selectElm = (idx) => window[selectId(idx)];
const setSelectElms = (arr) => {
	arr.forEach((val, idx) => {
		selectElm(idx).value = val;
	});
};

const getSelects = () => selects.map((val, idx) => selectElm(idx).value);

const getDimension = (idx) => {
	const { value } = window[selectId(idx)];
	return {
		label: metrics[value].label,
		field: value,
	};
};

selectContainer.innerHTML = selects.map((obj, idx) => `
	<select name="${selectId(idx)}" id="${selectId(idx)}" class="select-css">
		${_.entries(metrics).map(([key, opt]) => `
			<option value="${key}" ${obj.defaultSelected === key ? 'selected="selected"' : ''}>${opt.label}</option>
		`).join('')}
	</select>
`).join('');

const actionFldName = (idx, name) => `action_${idx}_${name}`;
const actionFld = (idx, name) => window[actionFldName(idx, name)];

actionsContainer.innerHTML = actions.map((obj, idx) => {
	const name = n => actionFldName(idx, n);
	return `
		<div style="display: inline-block; vertical-align: top;">
			<span style="font-weight: bold; color: ${obj.color}">Åtgärd ${idx + 1}</span>
			<div style="border-radius: 5px; border-style: solid; border-width: 1px; border-color: gray; width: min-content; padding: 5px; white-space: nowrap; background: white;">			
				<label for="${name('r0')}">Smittsamhet efteråt</label><br>
				<input step="0.1" min="0" max="${MAX_R0}" value="${DEFAULTS.r0}" type="number" id="${name('r0')}" name="${name('r0')}" style="border-radius: 5px; height: 20px; border-style: solid; border-width: 1px; border-color: gray; box-shadow: 2px 3px 9px 1px rgba(0, 0, 0, 0.2);"><br>
				<label for="${name('day')}">Dag för åtgärden</label><br>
				<input step="1" min="0" value="${100 + (idx * 40)}" type="number" id="${name('day')}" name="${name('day')}" style="border-radius: 5px; height: 20px; border-style: solid; border-width: 1px; border-color: gray; box-shadow: 2px 3px 9px 1px rgba(0, 0, 0, 0.2);"><br>				
				<span style="font-weight: bold">Aktivera<span> <input type="checkbox" id="${name('active')}" name="${name('active')}" style=""><br>				
			</div>
		</div>
	`;
}).join('');

_.entries(sections).forEach(([sectionKey, section]) => {
	const html = _.entries(inputs).filter(([key, { section }]) => section === sectionKey).map(([key, { label, min, max, isInteger, step }]) => `
		<div>
			<label for="${key}">${label}</label><br>
			<input min="${min || 0}" ${isInteger ? 'step="1"' : (step ? `step="${step}"`: '')} ${max ? `max="${max}"` : ''} type="number" id="${key}" name="${key}" style="border-radius: 5px; height: 20px; border-style: solid; border-width: 1px; border-color: gray; box-shadow: 2px 3px 9px 1px rgba(0, 0, 0, 0.2);"><br>
		</div>
	`).join('');
	inputContainer.innerHTML += `
		<div style="display: block; vertical-align: top;">
			<span style="font-weight: bold;">${section.label}</span>
			<div style="border-radius: 5px; border-style: solid; border-width: 1px; border-color: gray; width: min-content; padding: 5px; white-space: nowrap; background: white;">
				${html}
			</div>
		</div>	
	`;
});

const setInputs = (values) => {
	_.forOwn(values, (val, key) => {
		if (window[key]) {
			window[key].value = val == null ? '' : val.toString();
		}
	});
	const toSetNull = _.pick(inputs, (v, k) => v.allowNull && !(k in values));
	_.forOwn(toSetNull, (v, k) => {
		window[key].value = null;
	});
};

const getInputsInternal = () => {
	const res = _.mapValues(inputs, (v, k) => {
		const res = parseFloat(window[k].value);
		if (isNaN(res)) {
			return undefined;
		}
		return res;
	});
	return res;
};

const getActionsInternal = () => {
	return actions.map((obj, idx) => ({
		r0: parseFloat(actionFld(idx, 'r0').value),
		day: parseInt(actionFld(idx, 'day').value),
		active: actionFld(idx, 'active').checked,
		idx,
	}));
};

const setActions = (arr) => {
	arr.forEach((obj, idx) => {
		actionFld(idx, 'r0').value = obj.r0.toString();
		actionFld(idx, 'day').value = obj.day.toString();
		actionFld(idx, 'active').checked = obj.active;
	});
};

const orgSettings = {
	inputs: DEFAULTS,
	actions: getActionsInternal(),
	selects: getSelects(),
};

let initSettings = {};
try {
	initSettings = JSON.parse(atob(location.toString().split('settings=')[1]));
} catch(ex) {}

initSettings.inputs = initSettings.inputs || DEFAULTS;
if(initSettings.actions) {
	setActions(initSettings.actions);
} else {
	initSettings.actions = getActionsInternal();
}
if(initSettings.selects) {
	setSelectElms(initSettings.selects);
};

setInputs(initSettings.inputs);
let lastValidInputs = initSettings.inputs;
let lastValidActions = initSettings.actions;

let apiDeadNow;

$.getJSON('https://services5.arcgis.com/fsYDFeRKu1hELJJs/arcgis/rest/services/FOHM_Covid_19_FME_1/FeatureServer/3/query?f=json&where=1%3D1&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&outStatistics=%5B%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22Totalt_antal_avlidna%22%2C%22outStatisticFieldName%22%3A%22value%22%7D%5D&cacheHint=true', function(data) {
	apiDeadNow = data.features[0].attributes.value;
	deadNow.setAttribute('placeholder', apiDeadNow);
	recalculate();
});

const onChanged = () => {
	const reset = () => {
		setInputs(lastValidInputs);
		setActions(lastValidActions);
	}
	const d = getInputsInternal();
	const newActions = getActionsInternal();

	const orgD = _.clone(d);
	const orgActions = _.clone(newActions);

	const mustBeSet = _.pickBy(d, (v, k) => !(inputs[k] || {}).allowNull);
	if(_.findIndex(_.values(mustBeSet), (v) => v == null) >= 0) {
		return reset();
	}
	_.forOwn(d, (val, key) => {
		const settings = inputs[key];
		let newVal = val;
		if (newVal != null) {
			if (settings.isInteger) {
				newVal = Math.floor(newVal);
			}
			if (newVal < 0) {
				newVal = 0;
			}
			if (settings.min && newVal < settings.min) {
				newVal = settings.min;
			}
			if (settings.max && newVal > settings.max) {
				newVal = settings.max;
			}
		}
		d[key] = newVal;
	});
	d.avgTimeToDeath = Math.max(d.avgTimeToDeath, d.avgInfectTime + 1);
	d.avgTimeToRespirator = Math.max(d.avgTimeToRespirator, d.avgTimeToIntubation + 1);
	d.avgTimeToDeath = Math.max(d.avgTimeToDeath, d.avgTimeToRespirator + 1);
	d.needRespirator = Math.max(d.needRespirator, d.mortalityWithCare);
	d.needIntubation = Math.min(d.needIntubation, 100 - d.needRespirator);

	if (newActions.find(({ r0, day }) => isNaN(r0) || isNaN(day))) {
		return reset();
	}
	newActions.forEach((action) => {
		action.r0 = Math.min(Math.max(action.r0, 0), MAX_R0);
		action.day = Math.floor(Math.max(action.day, 0));
	});
	if(!_.isEqual(d, orgD)) {
		setInputs(d);
	}
	if(!_.isEqual(newActions, orgActions)) {
		setActions(newActions);
	}
	lastValidInputs = d;
	lastValidActions = newActions;
	recalculate();
};

[].forEach.call(actionsContainer.querySelectorAll('input'), elm => elm.addEventListener('change', onChanged));

_.keys(inputs).forEach((inp) => {
	window[inp].addEventListener("change", onChanged);
});

selects.map((__, idx) => {
	window[selectId(idx)].addEventListener("change", onChanged);
});

const resize = () => {
	graphContainer.style.width = isMobile() ? '100%' : 'auto';
	inputContainer.style.float = isMobile() ? 'none' : 'left';
	setTimeout(recalculate);
};

class DayData
{
	constructor(settings) {
		const VARS = _.keys(metrics);
		Object.assign(this, _.zipObject(VARS, new Array(VARS.length).fill(0)), settings);
	}
}

let chart;

const drawDiagram = ({ prevData, data, firstDim, secondDim }) => {
	const getDataArr = ({ field }) => {
		const { finalize } = metrics[field];
		return data.map((obj, idx) => {
			if(finalize) {
				const prev = idx ? data[idx - 1] : prevData;
				return finalize(obj, prev);
			}
			return Math.floor(obj[field]);
		});
	};
	var ctx = document.getElementById('canvas').getContext('2d');
	var lineChartData = {
		labels: data.map(d => d.label.toString()),
		datasets: [{
			label: firstDim.label,
			borderColor: window.chartColors.blue,
			backgroundColor: window.chartColors.blue,
			fill: false,
			data: getDataArr(firstDim),
			yAxisID: 'y-axis-1',
		}, {
			label: secondDim.label,
			borderColor: window.chartColors.red,
			backgroundColor: window.chartColors.red,
			fill: false,
			data: getDataArr(secondDim),
			yAxisID: 'y-axis-2'
		}]
	};

	const aspectRatio = isMobile() ? 1.5 : 2.5;

	options = {
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio,
		hoverMode: 'index',
		stacked: false,
		tooltips: {
			mode: 'index',
			intersect: false,
			callbacks: {
				title: ([{ xLabel }]) => "Dag " + xLabel,
			},
		},
		title: {
			display: true,
				text: 'Covid-19 prognos'
		},
		scales: {
			yAxes: [{
				type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
				display: true,
				position: 'left',
				id: 'y-axis-1',
			}, {
				type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
				display: true,
				position: 'right',
				id: 'y-axis-2',

				// grid line settings
				gridLines: {
					drawOnChartArea: false, // only want the grid lines for one axis to show up
				},
			}],
		}
	};

	if (chart) {
		chart.data = lineChartData;
		chart.options.options;
		chart.update({ duration: 0 });
		return;
	}

	chart = Chart.Line(ctx, {
		data: lineChartData,
		options,
	});

};

const drawActionBars = (startIdx, endIdx, deadIdx) => {
	const deadAction = { day: deadIdx, isDead: true, active: true };
	const visibleActions = lastValidActions.concat(deadAction).filter(a => a.active && a.day >= startIdx && a.day <= endIdx);
	const rect = canvas.getBoundingClientRect();
	const days = (endIdx - startIdx) + 1;
	const { left, right } = chart.chartArea;
	const width = (right - left) + 5;
	actionBarsContainer.innerHTML = visibleActions.map(action => {
		const leftPos = ((action.day - startIdx) / days) * width;
		if (action.isDead) {
			return `
				<div style="pointer-events: none; position: absolute; background: #48484814; width: ${leftPos}px; height: 100%; top: 0px; left: 0px;"></div>
				<div class="animate-flicker" style="pointer-events: none; position: absolute; background: red; width: 4px; height: 100%; top: 0px; left: ${leftPos}px;"></div>
			`;
			//	<div style="font-weight:bold; pointer-events: none; position: absolute; top: 20%; left: ${leftPos - 20}px; border-radius: 5px; border-style: solid; border-width: 1px; border-color: gray; width: min-content; padding: 5px; white-space: nowrap; background: white; box-shadow: 2px 3px 9px 1px rgba(0, 0, 0, 0.2)">
			//		Idag
			//	</div>
		}
		return `<div style="position: absolute; background: ${actions[action.idx].color}; width: 2px; height: 100%; top: 0px; left: ${leftPos}px;"></div>`;
	}).join('');
	actionBarsContainer.style.height = `${rect.height - 95}px`;
	actionBarsContainer.style.left = `${rect.left + left}px`;
}

const recalculate = () => {
	const d = lastValidInputs;
	const { population } = d;
	const days = 1000; // dagar vi simulerar
	const perDay = [new DayData({ infected: 1, newInfections: 1, label: '0' })];

	// dagar syrgas för någon som kommer behöva respirator
	const intubatorHardDays = d.avgTimeToRespirator - d.avgTimeToIntubation;

	// dagar i respirator för någon som dör
	const respiratorDeadDays = d.avgTimeToDeath - d.avgTimeToRespirator;

	// Förenkling => man överlever lika länge på syrgas som i respirator - efter att man behövde respirator
	const intubatorDeadDays = respiratorDeadDays;

	// Hur stor andel av dom som hamnar i respirator som dör
	const respiratorDeadFactor = d.needRespirator ? d.mortalityWithCare / d.needRespirator : 0;

	// Hur stor andel som behöver syrgas, det inkluderar dom som bara behöver syrgas + dom som behöver respirator
	const needIntubationFactor = (d.needRespirator + d.needIntubation) / 100;

	// Hur stor andel av dom som som börjar använda syrgas som senare kommer att behöva respirator
	const intubatorHardFactor = d.needRespirator ? d.needRespirator / (d.needRespirator + d.needIntubation) : 0;

	for(var i = 1; i < days; i++) {
		const daysAgo = (d) => (d > i ? new DayData() : perDay[i - d]);

		// Igår
		const prev = daysAgo(1);

		// Hitta vilken åtgärd (om någon) som används denna dag.
		const action = _.maxBy(lastValidActions.filter(a => a.active && a.day <= i), 'day');

		// använd R0 för åtgärden, eller annars standard-värdet
		const myR0 = action ? action.r0 : d.r0;

		// Andel av befolkningen som fortfarande kan smittas
		const stillInfectiousFactor = (population - prev.infected) / population;

		// Räkna ut hur många nya infektioner som sker idag. Om genmsnittlig tid för smitta är 6 dagar
		// så räknar vi med att denna dag smittas personer av andra som själva blev smittade för 1 t.o.m. 11 dagar sedan.
		const infectDays = (d.avgInfectTime * 2) - 1;
		let newInfections = 0;
		for(var j = 1; j <= infectDays; j++) {
			newInfections += (daysAgo(j).newInfections * myR0 * stillInfectiousFactor) / infectDays;
		}

		// Personer i respirator som dör idag
		const deadRespiratorUsers = daysAgo(respiratorDeadDays).enteredRespirator * respiratorDeadFactor;

		// Tillfrisknade personer som kan lämna respirator idag
		const curedRespiratorUsers = daysAgo(d.avgRespiratorDays).enteredRespirator * (1 - respiratorDeadFactor);

		// Hur många respiratorer blev lediga?
		const freedRespirators = deadRespiratorUsers + curedRespiratorUsers;

		// Hur många respiratorer som används idag (vi lägger snart på nya fall)
		let respiratorsUsed = Math.max(prev.respiratorsUsed - freedRespirators, 0);

		// Lediga respiratorer (innan dagens nya patienter)
		const freeRespirators = d.respirators - respiratorsUsed;

		// Nya patienter som *behöver* respirator (som tidigare haft syrgas)
		const newNeedRespirator = daysAgo(intubatorHardDays).enteredIntubationHard;

		// Håller reda på "dödsdömda" patienter med syrgas som behöver respirator men inte får det
		let enteredIntubationMortal = 0;

		// Nya patienter som *får* respirator
		const enteredRespirator = Math.min(newNeedRespirator, freeRespirators);

		if (newNeedRespirator > freeRespirators) { // Alla får inte plats i respirator
			enteredIntubationMortal = newNeedRespirator - freeRespirators; // Dom som inte fick plats (fortsätter med syrgas men kommer dö)
			respiratorsUsed = d.respirators; // Alla respiratorer används
		} else { // Alla får plats i respirator
			respiratorsUsed += newNeedRespirator;
		}

		// Patienter som inte fick respirator tidigare och dog idag
		const deadWithoutRespirator = daysAgo(intubatorDeadDays).enteredIntubationMortal;

		// Hur många syrgas-platser blev lediga?
		const freedIntubators =
			enteredRespirator + // dom som flyttades från syrgas => respirator
			deadWithoutRespirator + // dom som inte fick respirator och nu dog
			daysAgo(d.avgSurvivorIntubationDays).enteredIntubationLight; // dom som överlevde enbart med syrgas och nu kan sluta med det

		// Hur många syrgas-platser som används idag (vi lägger snart på nya fall)
		let intubatorsUsed = Math.max(prev.intubatorsUsed - freedIntubators, 0);

		// Lediga respiratorer (innan dagens nya patienter)
		const freeIntubators = d.intubationSlots - intubatorsUsed;

		// Nya patienter som *behöver* syrgas (som tidigare varit "friska")
		const newNeedIntubator = daysAgo(d.avgTimeToIntubation).newInfections * needIntubationFactor; //TODO: dom som går från respirator => tillbaka till syrgas

		// Hur många som behöver syrgas men inte får det. För att förenkla räknar vi som att dom dör direkt.
		let deadWithoutHelp = 0;

		// Nya patienter som *får* syrgas
		const enteredIntubation = Math.min(newNeedIntubator, freeIntubators);

		if (newNeedIntubator > freeIntubators) { // Alla får inte syrgas
			deadWithoutHelp = newNeedIntubator - freeIntubators; // Förenkling => patienter dör direkt när dom inte får syrgas
			intubatorsUsed = d.intubationSlots; // Alla syrgas-platser används
		} else { // Alla får syrgas
			intubatorsUsed += newNeedIntubator;
		}

		// Döda idag => Dom som dog efter att inte fått respirator + dom som dog när dom inte fick syrgas + dom i respirator som dog
		const newDead = deadWithoutRespirator + deadWithoutHelp + deadRespiratorUsers;

		perDay.push(new DayData({
			infected: prev.infected + newInfections,
			newInfections,
			dead: prev.dead + newDead,
			newDead,
			enteredIntubationHard: enteredIntubation * intubatorHardFactor, // Patienter som fick syrgas och senare kommer behöva respirator
			enteredIntubationLight: enteredIntubation * (1 - intubatorHardFactor), // Patienter som fick syrgas men kommer återhhämta sig *utan* respirator
			enteredIntubationMortal,
			enteredRespirator,
			respiratorsUsed,
			intubatorsUsed,
			deadWithoutRespirator,
			deadWithoutHelp,
			label: i.toString(),
		}));
	}
	let startIdx = _.findIndex(perDay, d => d.dead >= 1);
	let endIdx = _.findLastIndex(perDay, d => d.newDead >= 1 || d.newInfections >= 10);
	const deadNowVal = d.deadNow == null ? apiDeadNow : d.deadNow;
	const deadIdx = deadNowVal ? _.findLastIndex(perDay, d => d.dead < deadNowVal) : 0;
	if(startIdx < 0 ) {
		startIdx = 0;
	}
	if(endIdx < 0 ) {
		endIdx = perDay.length - 1;
	}
	drawDiagram({
		prevData: startIdx ? perDay[startIdx - 1] : new DayData(),
		data: perDay.slice(startIdx, endIdx + 1),
		firstDim: getDimension(0),
		secondDim: getDimension(1),
	});
	drawActionBars(startIdx, endIdx, deadIdx);
	const { dead, infected } = _.last(perDay);
	infoContainer.innerHTML = [
		{ desc: 'Döda totalt', value: Math.round(dead) },
		{ desc: 'Döda %', value: ((dead / population) * 100).toFixed(2) },
		{ desc: 'Smittade totalt', value: Math.round(infected) },
		{ desc: 'Smittade %', value: ((infected / population) * 100).toFixed(2) },
	].map(({ desc, value }) => `<div style="display: inline-block">${desc}: <span style="font-weight: bold">${value}</span></div>&nbsp;&nbsp;&nbsp;&nbsp;`).join('');
	copyLink.setAttribute('href', `${location.origin}${location.pathname}?settings=${btoa(JSON.stringify({
		inputs: lastValidInputs,
		actions: lastValidActions,
		selects: getSelects(),
	}))}`)
};

addEventListener("resize", resize);
resize();
recalculateBtn.addEventListener("click", recalculate);
resetBtn.addEventListener("click", () => {
	setInputs(orgSettings.inputs);
	setActions(orgSettings.actions);
	setSelectElms(orgSettings.selects);
	lastValidInputs = orgSettings.inputs;
	lastValidActions = orgSettings.actions;
	recalculate();
});
recalculate();
});
