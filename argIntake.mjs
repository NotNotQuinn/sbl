
import getopts from "getopts";

/**
 * @type {{ description: string; string?: Record<string, { help?: string, alias?: string | string[], default: any }>; boolean?: Record<string, { help?: string, alias?: string | string[], default: any }>; unknown?: (optionName: string) => boolean }}
 */
const cliOptionsWithHelp = {
	description: "sbljs: Compile JavaScript meant to run on supibot for NodeJS, or minify it for Supibot environments.",
	boolean: {
		'node': {
			help: 'Compile for a NodeJS environment.',
			alias: 'n',
			default: false
		},
		'supibot': {
			help: 'Compile for a Supibot environment.',
			alias: 's',
			default: false
		},
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
		'help': {
			help: 'Show this help text.',
			alias: 'h',
			default: false
		}
	},
	unknown: option => {
		console.error(`Unknown option "${option}"`);
		process.exit(1);
	},
};

/**
 * @param {typeof cliOptionsWithHelp} optionsWithHelp
 * @returns {{ cliOpts: getopts.Options, helpText: string }}
 */
function getCliOptions(optionsWithHelp) {
	/** @type {getopts.Options} */
	let cliOpts = { unknown: optionsWithHelp.unknown ?? (() => false) };
	let helpText = optionsWithHelp.description + '\n';

	/** @type {['string', 'boolean']} */
	const types = ['string', 'boolean'];
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
const { cliOpts, helpText } = getCliOptions(cliOptionsWithHelp);
export { helpText };
export const options = getopts(process.argv.slice(2), cliOpts);

