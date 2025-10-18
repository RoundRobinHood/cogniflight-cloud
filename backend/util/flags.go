package util

import (
	"fmt"
	"slices"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

// ParseArgs takes in a list of options and parses them.
// It returns:
// - a map of flag values (boolean for switch flags, strings for options)
// - a slice of positional parameters (parameters without matching flags)
// - an error (for when flags are used incorrectly, or invalid options are provided)
func ParseArgs(options []types.OptionDescriptor, args []string) (map[string]any, []string, error) {
	mapping := map[string]any{}
	leftovers := make([]string, 0)

	// First get all the default values in the map
	// Also serves as a sanity check on our options
	for _, option := range options {
		_, isBool := option.Default.(bool)
		_, isStr := option.Default.(string)
		if !isBool && !isStr {
			return nil, nil, fmt.Errorf("incorrect config setup: default value must be bool or str")
		}

		if _, ok := mapping[option.Identifier]; ok {
			return nil, nil, fmt.Errorf("incorrect config setup: options have duplicate identifiers")
		}

		mapping[option.Identifier] = option.Default
	}

	for i := 0; i < len(args); i++ {
		if len(args[i]) == 0 {
			continue
		}

		current := args[i]
		if current[0] != '-' || len(current) == 1 {
			leftovers = append(leftovers, current)
		} else if current[1] == '-' {
			if len(current) == 2 {
				// This means we received an "--" arg, which means to take the rest as positional args
				leftovers = append(leftovers, args[i+1:]...)
				break
			} else {
				// This means we received a long flag (starts with --, and len() > 2)
				// So, we do a simple lookup
				var option *types.OptionDescriptor
				flag_name := current[2:]

				for _, opt := range options {
					if slices.Contains(opt.Aliases, flag_name) {
						option = &opt
						break
					}
				}

				if option == nil {
					return nil, nil, fmt.Errorf("unknown flag: %q", current)
				}

				if _, isBool := option.Default.(bool); isBool {
					mapping[option.Identifier] = true
				} else {
					if i == len(args)-1 {
						return nil, nil, fmt.Errorf("missing flag value for %q", current)
					}
					i += 1
					mapping[option.Identifier] = args[i]
				}
			}
		} else {
			// This means short-flag mode
			for j := 1; j < len(current); j++ {
				var option *types.OptionDescriptor
				flag_name := string(current[j])

				for _, opt := range options {
					if slices.Contains(opt.Aliases, flag_name) {
						option = &opt
						break
					}
				}

				if option == nil {
					return nil, nil, fmt.Errorf("unknown flag: %s", "-"+flag_name)
				}

				if _, isBool := option.Default.(bool); isBool {
					mapping[option.Identifier] = true
				} else {
					if j != len(current)-1 {
						return nil, nil, fmt.Errorf("error: %q is a value flag", "-"+flag_name)
					}
					if i == len(args)-1 {
						return nil, nil, fmt.Errorf("missing flag value for %q", current)
					}
					i += 1
					mapping[option.Identifier] = args[i]
				}
			}
		}
	}

	return mapping, leftovers, nil
}
