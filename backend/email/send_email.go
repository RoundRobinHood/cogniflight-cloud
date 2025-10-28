package email

import "gopkg.in/gomail.v2"

type EmailConfig struct {
	Username, Password, Host string
	Port                     int
}

func (c EmailConfig) SendEmail(receiver, subject, contentType, content string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", c.Username)
	m.SetHeader("To", receiver)
	if subject != "" {
		m.SetHeader("Subject", subject)
	}
	m.SetBody(contentType, content)

	d := gomail.NewDialer(c.Host, c.Port, c.Username, c.Password)

	return d.DialAndSend(m)
}
