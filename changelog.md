# Changelog

## [1.7.1](https://github.com/ehmpathy/declastruct-aws/compare/v1.7.0...v1.7.1) (2026-07-10)


### Bug Fixes

* **iam:** support resource/action/principal include+exclude via Scope ([#60](https://github.com/ehmpathy/declastruct-aws/issues/60)) ([11749f7](https://github.com/ehmpathy/declastruct-aws/commit/11749f7ef781439902c892ed4dfb4217796edd16))

## [1.7.0](https://github.com/ehmpathy/declastruct-aws/compare/v1.6.0...v1.7.0) (2026-07-06)


### Features

* **ec2:** add launch templates and instance lifecycle operations ([#54](https://github.com/ehmpathy/declastruct-aws/issues/54)) ([d9d00bc](https://github.com/ehmpathy/declastruct-aws/commit/d9d00bcb929a24fa5acd5170a7aee7118d19607f))
* **ec2:** declarative ssh access + hibernate + NAT egress ([#59](https://github.com/ehmpathy/declastruct-aws/issues/59)) ([49d607f](https://github.com/ehmpathy/declastruct-aws/commit/49d607fd68eba3f4ab73d55a5789c3f9d4736d26))

## [1.6.0](https://github.com/ehmpathy/declastruct-aws/compare/v1.5.2...v1.6.0) (2026-06-20)


### Features

* **vpc:** add vpc infrastructure resources ([#51](https://github.com/ehmpathy/declastruct-aws/issues/51)) ([89d1d25](https://github.com/ehmpathy/declastruct-aws/commit/89d1d25fe68934534dad949b8b826c8b12cb142e))

## [1.5.2](https://github.com/ehmpathy/declastruct-aws/compare/v1.5.1...v1.5.2) (2026-06-15)


### Bug Fixes

* **lambda:** add genDeclaredAwsLambdaCode factory for auto hash computation ([#49](https://github.com/ehmpathy/declastruct-aws/issues/49)) ([ca734e8](https://github.com/ehmpathy/declastruct-aws/commit/ca734e8aec881d4239dddea1d37392fd11c1e15f))

## [1.5.1](https://github.com/ehmpathy/declastruct-aws/compare/v1.5.0...v1.5.1) (2026-06-14)


### Bug Fixes

* **provision:** make SSO env vars lazy for demo-only provisioning ([#45](https://github.com/ehmpathy/declastruct-aws/issues/45)) ([07606f2](https://github.com/ehmpathy/declastruct-aws/commit/07606f230635d0afe6c80f7fd26c0a852f838ee9))

## [1.5.0](https://github.com/ehmpathy/declastruct-aws/compare/v1.4.5...v1.5.0) (2026-05-03)


### Features

* **org:** add service control policy support ([#43](https://github.com/ehmpathy/declastruct-aws/issues/43)) ([f2a2bf4](https://github.com/ehmpathy/declastruct-aws/commit/f2a2bf416b709d895304c8b905a5bea1773bdeb7))

## [1.4.5](https://github.com/ehmpathy/declastruct-aws/compare/v1.4.4...v1.4.5) (2026-04-30)


### Bug Fixes

* **provision:** add secrets manager and ssm permissions for demo agent ([#40](https://github.com/ehmpathy/declastruct-aws/issues/40)) ([146d627](https://github.com/ehmpathy/declastruct-aws/commit/146d627ac52c3a5ccfed9597dc091764c37af0b1))

## [1.4.4](https://github.com/ehmpathy/declastruct-aws/compare/v1.4.3...v1.4.4) (2026-04-15)


### Bug Fixes

* **pkg:** update description on pkg ([#37](https://github.com/ehmpathy/declastruct-aws/issues/37)) ([ab14dff](https://github.com/ehmpathy/declastruct-aws/commit/ab14dff9f22c93fef22faf84f811b4cddc35e604))
* **vpc-tunnel:** include account+region in unique key for env isolation ([#39](https://github.com/ehmpathy/declastruct-aws/issues/39)) ([b62b939](https://github.com/ehmpathy/declastruct-aws/commit/b62b9397a38686fc78a5d9e6a9ede84d4971252c))

## [1.4.3](https://github.com/ehmpathy/declastruct-aws/compare/v1.4.2...v1.4.3) (2025-12-16)


### Bug Fixes

* **deps:** bump declastruct dep to latest ([#35](https://github.com/ehmpathy/declastruct-aws/issues/35)) ([ad1081f](https://github.com/ehmpathy/declastruct-aws/commit/ad1081f93f679ecc05b5c07300e8ea954670b0b1))

## [1.4.2](https://github.com/ehmpathy/declastruct-aws/compare/v1.4.1...v1.4.2) (2025-12-16)


### Bug Fixes

* **practs:** bump to latest best ([#33](https://github.com/ehmpathy/declastruct-aws/issues/33)) ([a507441](https://github.com/ehmpathy/declastruct-aws/commit/a5074415d1610f1a819db1472ca58fd5e554b106))

## [1.4.1](https://github.com/ehmpathy/declastruct-aws/compare/v1.4.0...v1.4.1) (2025-12-15)


### Bug Fixes

* **dao:** sync to updated declastruct dao contract ([#31](https://github.com/ehmpathy/declastruct-aws/issues/31)) ([defe40a](https://github.com/ehmpathy/declastruct-aws/commit/defe40a0ee1de9b42a837e48bdc51f7a9823d179))

## [1.4.0](https://github.com/ehmpathy/declastruct-aws/compare/v1.3.1...v1.4.0) (2025-12-15)


### Features

* **iam:** enable control of iam user access keys ([#26](https://github.com/ehmpathy/declastruct-aws/issues/26)) ([8fa0f41](https://github.com/ehmpathy/declastruct-aws/commit/8fa0f414d0cc1dc9ab5f43c4bb9a757314abeeba))


### Bug Fixes

* **cicd:** deworm github auth ([#27](https://github.com/ehmpathy/declastruct-aws/issues/27)) ([8baf567](https://github.com/ehmpathy/declastruct-aws/commit/8baf5674c1604be1ed7dc85721ee36213dade284))
* **cicd:** upgrade the release workflow ([#29](https://github.com/ehmpathy/declastruct-aws/issues/29)) ([460671f](https://github.com/ehmpathy/declastruct-aws/commit/460671f8862a3508458de8d4883a9668d2785660))
* **cicd:** upgrade the release workflow ([#30](https://github.com/ehmpathy/declastruct-aws/issues/30)) ([5f74b9a](https://github.com/ehmpathy/declastruct-aws/commit/5f74b9a6e37adcd5f1923747fdfb664e86a75ed8))

## [1.3.1](https://github.com/ehmpathy/declastruct-aws/compare/v1.3.0...v1.3.1) (2025-12-14)


### Bug Fixes

* **cicd:** unblock github declastruct ([#25](https://github.com/ehmpathy/declastruct-aws/issues/25)) ([cc8bb0e](https://github.com/ehmpathy/declastruct-aws/commit/cc8bb0eaf91a6d304c8de38c6475d6ff85a33bfc))
* **deps:** bump to latest declastruct shape ([#22](https://github.com/ehmpathy/declastruct-aws/issues/22)) ([57c7a71](https://github.com/ehmpathy/declastruct-aws/commit/57c7a71b595026b520634598f8498cb9c0e8e33a))
* **practs:** bump to npm oidc auth ([#23](https://github.com/ehmpathy/declastruct-aws/issues/23)) ([90454f4](https://github.com/ehmpathy/declastruct-aws/commit/90454f486968db8db6283abd966205639fb7b827))

## [1.3.0](https://github.com/ehmpathy/declastruct-aws/compare/v1.2.0...v1.3.0) (2025-12-11)


### Features

* **cloudwatch:** enable control of log group retention ([#19](https://github.com/ehmpathy/declastruct-aws/issues/19)) ([2eb7952](https://github.com/ehmpathy/declastruct-aws/commit/2eb7952465224db27437766d59eb936babf3aef4))
* **iam:** support iam sso and oidc resource control ([#21](https://github.com/ehmpathy/declastruct-aws/issues/21)) ([b87cbed](https://github.com/ehmpathy/declastruct-aws/commit/b87cbed6cbce4511c6f91c1213b2f2d669fffad5))
* **organization:** support aws orgnization account management ([#20](https://github.com/ehmpathy/declastruct-aws/issues/20)) ([cb4cf88](https://github.com/ehmpathy/declastruct-aws/commit/cb4cf88bde5d0d7036b902588316bca4ae4d5c79))


### Bug Fixes

* **practs:** bump to latest best ([#17](https://github.com/ehmpathy/declastruct-aws/issues/17)) ([5d99803](https://github.com/ehmpathy/declastruct-aws/commit/5d9980338381e04395789221e3d6480851d70aea))

## [1.2.0](https://github.com/ehmpathy/declastruct-aws/compare/v1.1.1...v1.2.0) (2025-12-05)


### Features

* **cloudwatch:** declare cloudwatch log group reports of cost and distribution ([#14](https://github.com/ehmpathy/declastruct-aws/issues/14)) ([e6f7ab7](https://github.com/ehmpathy/declastruct-aws/commit/e6f7ab703c85fc9f2c056d6402b65fd63f430df5))

## [1.1.1](https://github.com/ehmpathy/declastruct-aws/compare/v1.1.0...v1.1.1) (2025-11-30)


### Bug Fixes

* **docs:** add example of lambda usage to readme ([#12](https://github.com/ehmpathy/declastruct-aws/issues/12)) ([28679f6](https://github.com/ehmpathy/declastruct-aws/commit/28679f6cf06bf77ea54a5438f281c11a38d7c746))

## [1.1.0](https://github.com/ehmpathy/declastruct-aws/compare/v1.0.3...v1.1.0) (2025-11-30)


### Features

* **lambda:** control lambdas with versions and aliases ([#10](https://github.com/ehmpathy/declastruct-aws/issues/10)) ([c1d1832](https://github.com/ehmpathy/declastruct-aws/commit/c1d18322c406e6c1de5b4849713582d54448cd3f))

## [1.0.3](https://github.com/ehmpathy/declastruct-aws/compare/v1.0.2...v1.0.3) (2025-11-28)


### Bug Fixes

* **tunnel:** dont destroy tunnel but still detatch ([#9](https://github.com/ehmpathy/declastruct-aws/issues/9)) ([76ac446](https://github.com/ehmpathy/declastruct-aws/commit/76ac446dd04062dece472df5d8f7e95a8a7ad9df))
* **tunnel:** kill other port process on port collision ([#5](https://github.com/ehmpathy/declastruct-aws/issues/5)) ([d534bbb](https://github.com/ehmpathy/declastruct-aws/commit/d534bbb4c7d10640eeeac4b7e6e1a3db00073571))

## [1.0.2](https://github.com/ehmpathy/declastruct-aws/compare/v1.0.1...v1.0.2) (2025-11-28)


### Bug Fixes

* **dobjs:** explicitly declare metadata to support hasReadonly ([#6](https://github.com/ehmpathy/declastruct-aws/issues/6)) ([bb95392](https://github.com/ehmpathy/declastruct-aws/commit/bb9539252ea3c05afbfafb5ce74f5b41f4f36760))

## [1.0.1](https://github.com/ehmpathy/declastruct-aws/compare/v1.0.0...v1.0.1) (2025-11-28)


### Bug Fixes

* **tunnel:** ensure tunnel hashes dont collide across accounts ([#3](https://github.com/ehmpathy/declastruct-aws/issues/3)) ([81c2e38](https://github.com/ehmpathy/declastruct-aws/commit/81c2e38030af11cfa96efb10544234051985e50e))

## 1.0.0 (2025-11-28)


### Features

* **behavior:** declare blueprint via behavior ([6fcd7c2](https://github.com/ehmpathy/declastruct-aws/commit/6fcd7c2624e670fa497ba7d876b6d70b7ba6d8a8))
* **init:** initialize based on declastruct-github ([ab325bb](https://github.com/ehmpathy/declastruct-aws/commit/ab325bb9a6d56c6bbbd22e0ccfc7b12890bbf598))
* **tunnel:** fulfill behavior of DeclaredAwsVpcTunnel via declastruct interface ([112ae90](https://github.com/ehmpathy/declastruct-aws/commit/112ae90ebe15bf2e502386d832f457888041d0e9))


### Bug Fixes

* **cicd:** drop unused deps ([#2](https://github.com/ehmpathy/declastruct-aws/issues/2)) ([94c5b1c](https://github.com/ehmpathy/declastruct-aws/commit/94c5b1c28f192beee7fdcbdaeacf98a452cc7ccc))
