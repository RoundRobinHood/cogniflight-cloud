package util

import (
	"reflect"
	"testing"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

func TestParseArgs(t *testing.T) {
	opts := []types.OptionDescriptor{
		{Identifier: "verbose", Aliases: []string{"v", "verbose"}, Default: false},
		{Identifier: "force", Aliases: []string{"f", "force"}, Default: false},
		{Identifier: "output", Aliases: []string{"o", "output"}, Default: ""},
		{Identifier: "input", Aliases: []string{"i", "input"}, Default: ""},
	}

	tests := []struct {
		name      string
		args      []string
		wantMap   map[string]any
		wantLeft  []string
		wantError bool
	}{
		{
			name: "no args",
			args: []string{},
			wantMap: map[string]any{
				"verbose": false,
				"force":   false,
				"output":  "",
				"input":   "",
			},
			wantLeft: nil,
		},
		{
			name: "simple short flags",
			args: []string{"-vf"},
			wantMap: map[string]any{
				"verbose": true,
				"force":   true,
				"output":  "",
				"input":   "",
			},
			wantLeft: nil,
		},
		{
			name: "short flag with value",
			args: []string{"-o", "file.txt"},
			wantMap: map[string]any{
				"verbose": false,
				"force":   false,
				"output":  "file.txt",
				"input":   "",
			},
			wantLeft: nil,
		},
		{
			name: "long flags mixed with positional",
			args: []string{"--verbose", "--output", "out.log", "pos1", "pos2"},
			wantMap: map[string]any{
				"verbose": true,
				"force":   false,
				"output":  "out.log",
				"input":   "",
			},
			wantLeft: []string{"pos1", "pos2"},
		},
		{
			name: "stop parsing after --",
			args: []string{"--verbose", "--", "--output", "ignored.txt", "-f", "file1", "file2"},
			wantMap: map[string]any{
				"verbose": true,
				"force":   false,
				"output":  "",
				"input":   "",
			},
			wantLeft: []string{"--output", "ignored.txt", "-f", "file1", "file2"},
		},
		{
			name:      "unknown flag should error",
			args:      []string{"--notreal"},
			wantError: true,
		},
		{
			name:      "missing value for flag should error",
			args:      []string{"--output"},
			wantError: true,
		},
		{
			name:      "short value flag error when grouped",
			args:      []string{"-ov"},
			wantError: true, // 'o' needs a value, can't combine
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotMap, gotLeft, err := ParseArgs(opts, tt.args)
			if tt.wantError {
				if err == nil {
					t.Fatalf("expected error, got none")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if tt.wantLeft == nil {
				tt.wantLeft = []string{}
			}
			if !reflect.DeepEqual(gotMap, tt.wantMap) {
				t.Errorf("mapping mismatch:\n got  %#v\nwant %#v", gotMap, tt.wantMap)
			}
			if !reflect.DeepEqual(gotLeft, tt.wantLeft) {
				t.Errorf("leftovers mismatch:\n got  %#v\nwant %#v", gotLeft, tt.wantLeft)
			}
		})
	}
}
