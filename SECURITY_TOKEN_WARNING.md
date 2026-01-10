# ⚠️ SECURITY WARNING: Token Exposed

## Immediate Action Required

Your GitHub Personal Access Token was shared in our conversation. **You MUST revoke it immediately** and create a new one.

### Steps to Revoke Token:

1. Go to: **https://github.com/settings/tokens**
2. Find the token: `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`
3. Click **"Revoke"** or **"Delete"**
4. Confirm deletion

### Create a New Token:

1. Go to: **https://github.com/settings/tokens**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: `Sito Development`
4. Select scope: `repo` (Full control of private repositories)
5. Click **"Generate token"**
6. **Copy and save securely** (use a password manager)

### Best Practices:

✅ **DO:**
- Store tokens in password managers
- Use environment variables for tokens
- Rotate tokens regularly
- Use SSH keys for better security

❌ **DON'T:**
- Share tokens in chat or email
- Commit tokens to Git
- Share tokens in documentation
- Use the same token for multiple projects

### Alternative: Use SSH Keys

For better security, consider using SSH keys instead:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: https://github.com/settings/keys

# Change remote URL
git remote set-url origin git@github.com:professorcathk-art/sito.git
```

---

**Action Required:** Revoke the exposed token NOW!
