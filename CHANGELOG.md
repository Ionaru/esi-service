# Changelog
All notable changes to the esi-service project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## [Unreleased] -->
## [6.0.0] - 2021-11-06
### BREAKING CHANGES
- Dropped Node.js 10 support.

### Added
- Node.js 16 support.

## [5.0.0] - 2021-01-05
### BREAKING CHANGES
- Updated the minimum version of peerDependency 'axios' to 0.21.1.
- Added 'debug' and 'http-status-codes' to peerDependencies.

### Added
- A `debug` parameter to both `CacheController` and `PublicESIService` for debug logging.
- Node.js 14 support.

## [4.0.0] - 2020-04-19
### BREAKING CHANGES
- Dropped Node.js 8 support.
- Dropped Node.js 11 support.

### Added
- Ability to do a raw request to the ESI with custom config options, this request will not use caching and return the AxiosResponse object.
- Full headers to cached data, this will increase the cache size, but allows for custom interaction with headers.

### Changed
- Allow any axios 0.19 version to be used.

## [3.2.2] - 2019-08-26
### Changed
- `expiry` and `etag` values will be removed from cached requests when they are not in the response when the cache updates.

### Fixed
- Interface Exports.

## [3.2.1] - 2019-08-25
### Added
- Exports of the interfaces used in this package.

## [3.2.0] - 2019-08-25
### Added
- Possibility to provide default cache expiry times for URLs or domains.
- Code documentation.

## [3.1.1] - 2019-06-28
### Added
- Debug logging when cache is used to retrieve data.

## [3.1.0] - 2019-06-02
### Changed
- Changed typings of fetchESIData function, it will never return undefined.

## [3.0.0] - 2019-06-02
### BREAKING CHANGES
- Fixed typings for IResponseCache to reflect actual behaviour: not every index returns an ICacheObject.

### Changed
- Responses are now always saved in the response cache, even without cache headers.

## [2.0.0] - 2019-05-31
### BREAKING CHANGES
- Module will not work with Axios <= 0.18.0

### Changed
- Updated dependencies.
- Added Axios as peerdependency.

## [1.0.2] - 2019-04-29
### Changed
- Adjusted typings for the onRouteWarning function because its text parameter is never undefined.

## [1.0.1] - 2019-04-29
### Fixed
- Wrong debug names.

## [1.0.0] - 2019-04-29
### Added
- Initial codebase, copied from <https://github.com/Ionaru/eve-utils>.
- Setup for this project.

[Unreleased]: https://github.com/Ionaru/esi-service/compare/6.0.0...HEAD
[6.0.0]: https://github.com/Ionaru/esi-service/compare/5.0.0...6.0.0
[5.0.0]: https://github.com/Ionaru/esi-service/compare/4.0.0...5.0.0
[4.0.0]: https://github.com/Ionaru/esi-service/compare/3.2.2...4.0.0
[3.2.2]: https://github.com/Ionaru/esi-service/compare/3.2.1...3.2.2
[3.2.1]: https://github.com/Ionaru/esi-service/compare/3.2.0...3.2.1
[3.2.0]: https://github.com/Ionaru/esi-service/compare/3.1.1...3.2.0
[3.1.1]: https://github.com/Ionaru/esi-service/compare/3.1.0...3.1.1
[3.1.0]: https://github.com/Ionaru/esi-service/compare/3.0.0...3.1.0
[3.0.0]: https://github.com/Ionaru/esi-service/compare/2.0.0...3.0.0
[2.0.0]: https://github.com/Ionaru/esi-service/compare/1.0.2...2.0.0
[1.0.2]: https://github.com/Ionaru/esi-service/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/Ionaru/esi-service/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/Ionaru/esi-service/compare/7d031b0...1.0.0
