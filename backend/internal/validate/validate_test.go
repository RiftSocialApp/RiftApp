package validate

import "testing"

func TestUsername_Valid(t *testing.T) {
	valid := []string{"ab", "hello", "user_name", "a-b", "A1_b-c"}
	for _, u := range valid {
		if err := Username(u); err != nil {
			t.Errorf("expected valid username %q, got error: %v", u, err)
		}
	}
}

func TestUsername_Invalid(t *testing.T) {
	cases := []struct {
		name  string
		input string
	}{
		{"too short", "a"},
		{"empty", ""},
		{"too long", string(make([]byte, 33))},
		{"special chars", "user@name"},
		{"spaces", "user name"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := Username(tc.input); err == nil {
				t.Errorf("expected error for username %q", tc.input)
			}
		})
	}
}

func TestPassword_Valid(t *testing.T) {
	if err := Password("12345678"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestPassword_TooShort(t *testing.T) {
	if err := Password("1234567"); err == nil {
		t.Error("expected error for short password")
	}
}

func TestPassword_TooLong(t *testing.T) {
	if err := Password(string(make([]byte, 129))); err == nil {
		t.Error("expected error for long password")
	}
}

func TestEmail_Valid(t *testing.T) {
	if err := Email("user@example.com"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestEmail_Invalid(t *testing.T) {
	if err := Email("not-an-email"); err == nil {
		t.Error("expected error for invalid email")
	}
}

func TestHubName_Valid(t *testing.T) {
	if err := HubName("My Hub"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestHubName_Empty(t *testing.T) {
	if err := HubName(""); err == nil {
		t.Error("expected error for empty hub name")
	}
}

func TestStreamName_Valid(t *testing.T) {
	if err := StreamName("general"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestStreamName_Empty(t *testing.T) {
	if err := StreamName(""); err == nil {
		t.Error("expected error for empty stream name")
	}
}

func TestContentLength_Valid(t *testing.T) {
	if err := ContentLength("hello", 100); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestContentLength_TooLong(t *testing.T) {
	if err := ContentLength("hello world", 5); err == nil {
		t.Error("expected error for content too long")
	}
}

func TestDisplayName_Valid(t *testing.T) {
	if err := DisplayName("Alice"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestDisplayName_TooLong(t *testing.T) {
	long := make([]rune, 65)
	for i := range long {
		long[i] = 'x'
	}
	if err := DisplayName(string(long)); err == nil {
		t.Error("expected error for long display name")
	}
}

func TestBio_Valid(t *testing.T) {
	if err := Bio("This is my bio"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestBio_TooLong(t *testing.T) {
	long := make([]rune, 191)
	for i := range long {
		long[i] = 'x'
	}
	if err := Bio(string(long)); err == nil {
		t.Error("expected error for long bio")
	}
}
