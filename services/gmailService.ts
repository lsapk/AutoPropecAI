// Helper to create a Base64URL encoded email string compliant with RFC 2822
export const createEmailRawString = (to: string, subject: string, body: string): string => {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`, // Handle UTF-8 subjects
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    body.replace(/\n/g, '<br>') // Simple conversion for text drafts to HTML
  ];

  const email = emailLines.join("\r\n");
  
  // Base64URL encode (replace + with -, / with _, remove =)
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const sendGmail = async (accessToken: string, to: string, subject: string, body: string) => {
  const raw = createEmailRawString(to, subject, body);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: raw
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to send email via Gmail API');
  }

  return await response.json(); // Returns { id, threadId, labelIds }
};
