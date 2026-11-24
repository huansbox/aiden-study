// Preserve the original bitter-melon publishing command.
import {publishSite} from '../../scripts/publish-taigi-site.mjs';
await publishSite('taigi-bitter-melon', process.argv.slice(2));
