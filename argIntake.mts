
import getopts from "getopts";
import { optionsWithHelp } from "./util/getCliOptions.mjs";
import getCliOptions from "./util/getCliOptions.mjs";

/**
 * @type {optionsWithHelp}
 */
const cliOptionsWithHelp: optionsWithHelp = {
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

