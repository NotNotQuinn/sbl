declare module 'supi-core/classes/command' { };
declare module 'supi-core/singletons/utils' { }
declare module 'getopts' {
	/**
 * @param argv Arguments to parse.
 * @param options Parsing options (configuration).
 * @returns The parsed arguments.
 */
	function getopts(
		argv: string[],
		options?: getopts.Options
	): getopts.ParsedOptions;

	export default getopts;

	namespace getopts {
		export interface ParsedOptions {
			_: string[];
			[key: string]: any;
		}

		export interface Options {
			alias?: { [key: string]: string | string[]; };
			string?: string[];
			boolean?: string[];
			default?: { [key: string]: any; };
			unknown?: (optionName: string) => boolean;
			stopEarly?: boolean;
		}
	}
}
