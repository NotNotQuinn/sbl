
import getopts from 'getopts';

export type optionsWithHelp = {
	description: string;
	string?: Record<string, {
		help?: string;
		alias?: string | string[];
		default?: any;
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
export default function getCliOptions(optionsWithHelp: optionsWithHelp): { cliOpts: getopts.Options; helpText: string; } {
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
