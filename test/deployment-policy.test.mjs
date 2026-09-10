import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentMode } from '../src/lib/deployment-policy.ts';
const fixture = '01f5b02f-d7c0-42cd-b880-59f78ea70aa3';
const lease = 'a05e58d1-b532-49b7-984f-9fca58104286';
test('ordinary production deployment still rejects the maintained fixture', () => {
 assert.throws(() => deploymentMode(fixture, {NODE_ENV:'production'}), /own store/);
});
test('an explicit acceptance lease requires an explicit publishable key', () => {
 assert.throws(() => deploymentMode(fixture, {NODE_ENV:'production',HEADLESS_ACCEPTANCE_LEASE_ID:lease}), /allocated lease/);
 assert.throws(() => deploymentMode(fixture, {NODE_ENV:'production',HEADLESS_ACCEPTANCE_LEASE_ID:'not-a-lease',HEADLESS_PUBLISHABLE_KEY:'pk_acceptance'}), /allocated lease/);
});
test('hosted acceptance is explicitly distinguished from a merchant deployment', () => {
 assert.equal(deploymentMode(fixture, {NODE_ENV:'production',HEADLESS_ACCEPTANCE_LEASE_ID:lease,HEADLESS_PUBLISHABLE_KEY:'pk_acceptance'}),'acceptance');
 assert.equal(deploymentMode('f7e1912c-3977-4cbd-a3f7-c8c70b8021f5', {NODE_ENV:'production'}),'merchant');
});
