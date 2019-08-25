# Changelog
All notable changes to the esi-service project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
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

[Unreleased]: https://github.com/Ionaru/esi-service/compare/3.1.1...HEAD
[3.1.1]: https://github.com/Ionaru/esi-service/compare/3.1.0...3.1.1
[3.1.0]: https://github.com/Ionaru/esi-service/compare/3.0.0...3.1.0
[3.0.0]: https://github.com/Ionaru/esi-service/compare/2.0.0...3.0.0
[2.0.0]: https://github.com/Ionaru/esi-service/compare/1.0.2...2.0.0
[1.0.2]: https://github.com/Ionaru/esi-service/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/Ionaru/esi-service/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/Ionaru/esi-service/compare/7d031b0...1.0.0
