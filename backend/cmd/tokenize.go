package cmd

import (
	"fmt"
	"strconv"
	"strings"
)

// ParseCommand splits a string into args with shell-like escaping rules
func ParseCommand(input string) ([]string, error) {
	var args []string
	var current strings.Builder
	inDoubleQuotes := false
	inSingleQuotes := false

	for i := 0; i < len(input); i++ {
		c := input[i]

		switch c {
		case '\\':
			if inSingleQuotes {
				current.WriteByte(c) // literal backslash in single quotes
			} else {
				if i+1 < len(input) {
					n := input[i+1]
					switch n {
					case 'n':
						current.WriteString("\r\n")
						i++
					case 'r':
						if i+3 < len(input) && input[i+2] == '\\' && input[i+3] == 'n' {
							current.WriteString("\r\n")
							i += 3
						} else {
							current.WriteByte('\r')
							i++
						}

					case 'x':
						if i+3 >= len(input) {
							return nil, fmt.Errorf("incomplete \\x escape")
						}
						hexDigits := input[i+2 : i+4]
						b, err := strconv.ParseUint(hexDigits, 16, 8)
						if err != nil {
							return nil, fmt.Errorf("invalid \\x escape: %s", hexDigits)
						}
						current.WriteByte(byte(b))
						i += 3 // skip \ x HH

					case 'u':
						if i+5 >= len(input) {
							return nil, fmt.Errorf("incomplete \\u escape")
						}
						hexDigits := input[i+2 : i+6]
						r, err := strconv.ParseUint(hexDigits, 16, 32)
						if err != nil {
							return nil, fmt.Errorf("invalid \\u escape: %s", hexDigits)
						}
						current.WriteRune(rune(r))
						i += 5 // skip \ u HHHH

					default:
						current.WriteByte(n)
						i++
					}
				} else {
					return nil, fmt.Errorf("unused escape at the end of the command")
				}
			}
		case '"':
			if inSingleQuotes {
				current.WriteByte(c)
			} else {
				inDoubleQuotes = !inDoubleQuotes
			}
		case '\'':
			if inDoubleQuotes {
				current.WriteByte(c)
			} else {
				if inSingleQuotes {
					if i+1 < len(input) && input[i+1] == '\'' {
						current.WriteByte('\'')
						i++
					} else {
						inSingleQuotes = false
					}
				} else {
					inSingleQuotes = true
				}
			}

		case ' ', '\t':
			if inSingleQuotes || inDoubleQuotes {
				current.WriteByte(' ')
			} else {
				args = append(args, current.String())
				current.Reset()
			}

		default:
			current.WriteByte(c)
		}
	}

	args = append(args, current.String())

	if inSingleQuotes || inDoubleQuotes {
		return nil, fmt.Errorf("unclosed quote in input")
	}

	return args, nil
}
