package cmd

import (
	"fmt"
	"strings"

	"github.com/RoundRobinHood/sh"
)

type CmdHelp struct{}

func (CmdHelp) Identifier() string {
	return "help"
}

func (CmdHelp) Run(ctx sh.CommandContext) int {

	output :=
		`
Help menu

Hint: you can also run "activate" to interact with our command-line assistant

Commands:

# whoami
whoami returns structured output concerning the current user session.
This includes AuthStatus information (such as username and user tags), and the contents of the user's user.profile file

# ls [-yl] [DIRS...]
ls prints out the files available in the specified directory(s).
options:
"y": yaml structured output
"l": long output (as opposed to simple field names)

# cat [FILES...]
cat outputs the contents of the given files in order.
If it isn't given any files to cat, it copies stdin to stdout.

# cd <filepath>
cd changes the working directory (stored in env as $PWD). This affects commands that take in filepaths, as they detect the relative path and resolve it against the current working directory.

# tee [FILES...]
tee opens the given files and writes stdin to all the files and stdout.
If tee isn't given any files to overwrite, it simply doesn't do file ops (same as cat)

# echo [-en] [ARGS...]
echo prints the given arguments to stdout with spaces between them according to the options it can be provided.
options:
"e": escape - unescape '\' sequences, such as \n.
"n": no-newline - don't print a newline after all the args.

# error [ARGS...]
error prints all the arguments, with spaces between them to stderr, and fails immediately with exit code 1.

# clients
clients prints out server-tracked information about the different clients connected on the current websocket session.

# sockets // NOTE: only users with "sysadmin" tag can run this command
sockets logs the socket sessions that currently are using resources on the server.

# pilots // NOTE: only users with either "sysadmin" or "atc" tags can run this command
pilots prints the names of all pilots on the current filesystem. Further information about a specific pilot can then be found in their home folder at /home/<username>

`

	crlf := strings.ReplaceAll(output, "\n", "\r\n")
	fmt.Fprint(ctx.Stdout, crlf)

	return 0
}
