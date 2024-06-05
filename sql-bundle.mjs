#!/usr/bin/env node

import { createBundle } from "./index.mjs";

await createBundle(process.argv.slice(2));
