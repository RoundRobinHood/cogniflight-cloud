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

Hint: you can also run "activate bob" to interact with our command-line assistant

Commands:

# help
help displays this info menu

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

# mkdir [-p] <PATHS...>
mkdir is used to create directories. Created directories inherit permissions from their parents.
The -p flag tells mkdir to make all parent directories if they don't exist, and not to return an error if the target directory already exists.

# mv <SOURCE_PATHS...> <DEST_PATH>
mv moves files or folders to another destination.
Both mv and cp share this behavior concerning the destination path:
If the destination path exists, the target is to "add children" to it.
If it doesn't exist, the target is to make sure that that exact path exists.
(this is what also brings about renaming)

# cp [-r] <SOURCE_PATHS...> <DEST_PATH>
cp copies the contents of a file or folder. It doesn't allow you to copy directories without the -r flag.

# rm [-rf] <PATHS...>
rm is used to remove entries from the filesystem. The -r flag is necessary for deleting directories
The -f flag is for cases where you don't have write permission on the parent (in that case, -f checks whether you have update-perm permissions on the parent instead)

# echo [-en] [ARGS...]
echo prints the given arguments to stdout with spaces between them according to the options it can be provided.
options:
"e": escape - unescape '\' sequences, such as \n.
"n": no-newline - don't print a newline after all the args.

# chmod [-R] <MODE> <PATHS...>
chmod changes the tag list for a specific file access mode on your provided file(s).
MODE is in the form of <tagname><{+|-}><[rwxp]>
Which indicates that you are either adding, revoking or overriding access for a user with a specific tag to read, write, execute or update the permissions of a file.
You must have the update permission on the file to do this, and if you try to update permissions update tags, safety rules apply. (i.e., unless you're a sysadmin you can only add/remove update perms you own, and can't lock yourself out of your file)
If you don't provide -R, this doesn't affect subdirectories

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
