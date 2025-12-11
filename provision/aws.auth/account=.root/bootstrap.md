# bootstrap admin sso access

this guide enables admins to sign in via `aws sso login` instead of root credentials.

---

## 1. signin as root & enable mfa

`iam -> users -> root user -> security credentials -> mfa`

---

## 2. enable aws identity center

`aws console -> iam identity center -> enable`

choose **aws identity center directory (default)** unless you want external identity providers.

---

## 3. create an admin permission set

`identity center -> permission sets -> create permission set`

```
name: AdministratorAccess
type: predefined
policy: AdministratorAccess
session duration: 4 hours
require mfa: yes
```

---

## 4. create your admin user

`identity center -> users -> create user`

```
email: you@yourdomain.com
username: you
name: your name
```

---

## 5. assign admin user to account

`identity center -> aws accounts -> assign users or groups`

```
target account: <your aws account>
permission set: AdministratorAccess
user: you
```

---

## 6. configure aws cli for sso

```bash
aws configure sso
```

follow the prompts:

| prompt | example value | notes |
|--------|---------------|-------|
| sso session name | `ehmpathy.root.admin` | |
| sso start url | `https://d-xxxxxxxx.awsapps.com/start` | found on identity center home page as "aws access portal url" |
| sso region | `us-east-1` | |
| sso registration scopes | (press enter) | default is fine |
| confirm login | (browser opens) | approve the request |
| default client region | (press enter) | us-east-1 default is fine |
| cli default output format | (press enter) | json default is best |
| profile name | `ehmpathy.root.admin` | |

verify it works:

```bash
aws sts get-caller-identity --profile ehmpathy.root.admin
```

---

## 7. add a bash alias for convenience

```bash
findsert_alias() {
  local func_def='use_ehmpathy_root_admin() { export AWS_PROFILE=ehmpathy.root.admin; aws sts get-caller-identity &>/dev/null || aws sso login; }'
  local alias_def='alias use.ehmpathy.root.admin=use_ehmpathy_root_admin'
  grep -qxF "$func_def" ~/.bash_aliases || echo "$func_def" >> ~/.bash_aliases
  grep -qxF "$alias_def" ~/.bash_aliases || echo "$alias_def" >> ~/.bash_aliases
  source ~/.bash_aliases
}
findsert_alias
```

---

## 8. verify bootstrap & provision resources

once bootstrap is complete, you can provision the admin resources:

```bash
use.ehmpathy.root.admin
npx declastruct plan provision/aws.auth/account=.root/resources.ts
npx declastruct apply provision/aws.auth/account=.root/resources.ts
```

all resources should show as **KEEP** if already provisioned correctly.
