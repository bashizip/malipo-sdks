# Malipo SDKs Publishing Guide

Follow these instructions to publish the updated versions of the Malipo SDKs to their respective package managers.

## 1. Node.js (`malipo-node`)
**Platform:** [NPM](https://www.npmjs.com/package/malipo-node)
**Published:** `1.3.0-beta.1` under `beta`; stable `latest` remains `1.2.5`.

The immutable beta tarball passed public sandbox and signed-webhook acceptance.
Its registry integrity and fresh ESM/CJS installation are recorded in the MMS
receipt `docs/evidence/b2c-npm-publication-20261004.json`. Do not republish or
rebuild this version; corrections require a new version.

```bash
npm install malipo-node@1.3.0-beta.1
```

The beta requires the compatible B2C API and an explicitly authorized sandbox
server key. Merchant backends own customer wallets; real B2C payouts remain disabled.

---

## 2. Python (`malipo-python`)
**Platform:** [PyPI](https://pypi.org/)
**Version:** 1.0.3

```bash
cd malipo-python
# Build the distribution packages
python3 -m pip install --upgrade build hatch
python3 -m build
# Upload using twine
python3 -m pip install --upgrade twine
python3 -m twine upload dist/*
```

---

## 3. PHP (`malipo-php`)
**Platform:** [Packagist](https://packagist.org/)
**Version:** 1.0.4

The PHP SDK uses a subtree split into a dedicated read-only repository (`bashizip/malipo-php`) for Packagist. Versioning is done by prefixing tags in the monorepo.
```bash
# Tag the monorepo with the 'php-' prefix
git tag php-v1.0.4
# Push the tag to GitHub
git push origin php-v1.0.4
```
A GitHub action will automatically sync the contents to the read-only repository and tag it as `v1.0.4`, which triggers Packagist.

---

## 4. Flutter/Dart (`malipo-flutter`)
**Platform:** [Pub.dev](https://pub.dev/)
**Version:** 1.1.3

```bash
cd malipo-flutter
# Run dry-run to check for issues
flutter pub publish --dry-run
# Publish to Pub.dev
flutter pub publish
```

---

## 5. Java (`malipo-java`)
**Platform:** [Maven Central](https://central.sonatype.com/)
**Version:** 1.0.1

```bash
cd malipo-java
# NOTE: pom.xml has no release plumbing yet - no distributionManagement, no source/javadoc
# jars, no GPG signing and no `release` profile - so this command cannot publish anything to
# Maven Central until that is added. The Java SDK is not published.
mvn clean deploy -P release
```

---

## Summary of Versions to Publish
- **Node.js**: beta v1.3.0-beta.1 published; stable v1.2.5
- **Python**: v1.0.3
- **PHP**: v1.0.4
- **Flutter**: v1.1.3
- **Java**: v1.0.1
