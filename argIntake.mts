
import getopts from 'getopts';

type optionsWithHelp = {
	description: string;
	string?: Record<string, {
		help?: string;
		alias?: string | string[];
		default?: any;
		type: "string" | "array";
	}>;
	boolean?: Record<string, {
		help?: string;
		alias?: string | string[];
		default?: any;
	}>;
	unknown?: (optionName: string) => boolean;
};

/**
 * dank
 */
function getCliOptions(optionsWithHelp: optionsWithHelp): { cliOpts: getopts.Options; helpText: string; } {
	let cliOpts: getopts.Options = { unknown: optionsWithHelp.unknown ?? (() => false) };
	let helpText = optionsWithHelp.description + '\n';

	const types: ['string', 'boolean'] = ['string', 'boolean'];
	types.forEach(type => {
		let section = optionsWithHelp[type] ?? {};
		Object.entries(section).forEach(([option, { help, alias, default: d_fault }], i) => {
			if (i === 0) helpText += `${type}s:\n`;
			helpText += `\t${option.length === 1 ? '-' + option : '--' + option}`;

			cliOpts[type] ??= [];
			// @ts-ignore
			cliOpts[type].push(option);
			if (typeof alias !== "undefined") {
				if (!Array.isArray(alias) && typeof alias === "string") {
					alias = [alias];
				}
				alias.forEach(alias => {
					helpText += " " + (alias.length === 1 ? '-' + alias : '--' + alias);
				});

				cliOpts["alias"] ??= {};
				cliOpts.alias[option] = alias;
			}
			if (typeof d_fault !== "undefined") {
				helpText += "   (default: " + d_fault + ")";
				cliOpts["default"] ??= {};
				cliOpts.default[option] = d_fault;
			}
			helpText += '\n';
			helpText += "\t\t" + help + "\n\n";
		});
	});

	return { cliOpts, helpText };
}

/**
 * @type {optionsWithHelp}
 */
const cliOptionsWithHelp: optionsWithHelp = {
	description: "sbljs: Minify & bundle JavaScript meant to run on supibot.",
	boolean: {
		'watch': {
			help: 'Compile on file changes.',
			alias: 'w',
			default: false
		},
		'minify': {
			help: 'Minify the output.',
			alias: 'm',
			default: false
		},
		'skip-type-check': {
			help: 'Do not run the type checker (tsc).',
			default: false
		},
		'help': {
			help: 'Show this help text.',
			alias: 'h',
			default: false
		}
	},
	unknown: (option: string) => {
		console.error(`Unknown option "${option}"`);
		process.exit(1);
	},
};

const { cliOpts, helpText } = getCliOptions(cliOptionsWithHelp);
const options = getopts(process.argv.slice(2), cliOpts);
export { options, helpText };

