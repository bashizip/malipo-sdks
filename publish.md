# Malipo SDKs Publishing Guide

Follow these instructions to publish the updated versions of the Malipo SDKs to their respective package managers.

## 1. Node.js (`malipo-node`)
**Platform:** [NPM](https://www.npmjs.com/)
**Version:** 1.2.1

```bash
cd malipo-node
# Ensure dependencies are installed and build is successful
npm install
npm run build
# Publish to NPM
npm publish
```

---

## 2. Python (`malipo-python`)
**Platform:** [PyPI](https://pypi.org/)
**Version:** 1.0.1

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
**Version:** 1.0.1

PHP/Composer libraries are typically synced via Git tags.
```bash
# Tag the version
git tag v1.0.1
# Push the tag to GitHub (Packagist will auto-update if configured via webhook)
git push origin v1.0.1
```

---

## 4. Flutter/Dart (`malipo-flutter`)
**Platform:** [Pub.dev](https://pub.dev/)
**Version:** 1.1.1

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
# Clean and deploy (requires GPG signing and Maven settings.xml configured)
mvn clean deploy -P release
```

---

## Summary of Versions to Publish
- **Node.js**: v1.2.1
- **Python**: v1.0.1
- **PHP**: v1.0.1
- **Flutter**: v1.1.1
- **Java**: v1.0.1
