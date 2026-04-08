import { describe, expect, test } from 'bun:test';
import { detectQueryType, extractPersonFirstName, extractQueryBody } from '../../services/messageParser.ts';

describe('detectQueryType', () => {
    test('returns urgent for messages containing urgent query', () => {
        expect(detectQueryType('urgent query please help')).toBe('urgent');
    });
    test('returns priority for messages containing priority query', () => {
        expect(detectQueryType('priority query please help')).toBe('priority');
    });
    test('returns xero for messages containing xero service restart request', () => {
        expect(detectQueryType('xero service restart request')).toBe('xero');
    });
    test('returns general for messages containing general query', () => {
        expect(detectQueryType('general query please help')).toBe('general');
    });
    test('returns unknown for messages that do not match any known query type', () => {
        expect(detectQueryType('this is a random message')).toBe('unknown');
    });
});

describe('extractPersonFirstName', () => {
    test('grabs person first name from Slack user', () => {
      const message = `Midas Slack Bot\nJohn Smith\nI need help with a job finance issue`;
        expect(extractPersonFirstName(message)).toBe('John');
    });
    test('Does not grab person first name from Slack user as the bot name does not match', () => {
      const message = `Mibas Slack Bot\nJohn Smith\nI need help with a job finance issue`;
        expect(extractPersonFirstName(message)).toBe(null);
    });
    test('Does not grab person first name from Slack user when the message format is missing details', () => {
      const message = `Midas Slack Bot`;
        expect(extractPersonFirstName(message)).toBe(null);
    });
  });

describe('extractQueryBody', () => {
    test('grabs query body from Slack message', () => {
        const message = `Midas Slack Bot\nJohn Smith\nI need help with a job finance issue`;
        expect(extractQueryBody(message)).toBe('I need help with a job finance issue');
    });
    test('Grabs Xero restart request from Slack message', () => {
        const message = `Midas Slack Bot\nJohn Smith\nXero service restart request`;
        expect(extractQueryBody(message)).toBe('Xero service restart request');
    });
    test('Grabs query body from Slack message, including user tagging', () => {
        const message = `Midas Slack Bot\nJohn Smith\n<@U12345> I need help with a job finance issue`;
        expect(extractQueryBody(message)).toBe('<@U12345> I need help with a job finance issue');
    });
    test('Grabs query body from Slack message, excluding "<!here>" and "<!channel>" tags', () => {
        const message1 = `Midas Slack Bot\nJohn Smith\n<!here> I need help with a job finance issue`;
        const message2 = `Midas Slack Bot\nJohn Smith\n<!channel> I need help with a job finance issue`;
        expect(extractQueryBody(message1)).toBe('I need help with a job finance issue');
        expect(extractQueryBody(message2)).toBe('I need help with a job finance issue');
    });
    test('Cannot grab query body from Slack message as there is no query', () => {
        const message = `Midas Slack Bot\nJohn Smith`;
        expect(extractQueryBody(message)).toBe(null);
    });
});