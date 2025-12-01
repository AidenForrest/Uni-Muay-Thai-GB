import { MockDataService } from './mockData';

// Speed up tests by removing artificial delay
jest.mock('../config/features', () => ({
  CONFIG: {
    MOCK_API_DELAY: 0
  }
}));

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    service = new MockDataService();
  });

  describe('login', () => {
    it('returns medic profile when email contains "medic"', async () => {
      const result = await service.login('medic@test.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data?.profile.userType).toBe('medic');
      expect(result.data?.profile.scopes).toContain('personalise:role:medic');
    });

    it('returns medic profile when email contains "doctor"', async () => {
      const result = await service.login('doctor@hospital.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data?.profile.userType).toBe('medic');
    });

    it('returns fighter profile for regular emails', async () => {
      const result = await service.login('fighter@gym.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data?.profile.userType).toBe('fighter');
      expect(result.data?.profile.scopes).toContain('personalise:role:athlete');
    });

    it('returns auth user with correct uid', async () => {
      const result = await service.login('test@test.com', 'password');

      expect(result.data?.user.uid).toBe(result.data?.profile.profileId);
    });
  });

  describe('getMedicalPass', () => {
    it('returns medical pass for known fighter', async () => {
      const result = await service.getMedicalPass('mock-fighter-123');

      expect(result.success).toBe(true);
      expect(result.data?.profile.profileId).toBe('mock-fighter-123');
      expect(result.data?.profile.name).toBe('Test Fighter');
      expect(result.data?.history).toBeDefined();
      expect(Array.isArray(result.data?.history)).toBe(true);
    });

    it('returns medical pass with generated data for unknown fighter', async () => {
      const result = await service.getMedicalPass('unknown-fighter-xyz');

      expect(result.success).toBe(true);
      expect(result.data?.profile.profileId).toBe('unknown-fighter-xyz');
      expect(result.data?.profile.name).toContain('Demo Fighter');
      expect(result.data?.history).toEqual([]);
    });

    it('returns history sorted by date descending', async () => {
      const result = await service.getMedicalPass('mock-fighter-123');
      const history = result.data?.history || [];

      for (let i = 1; i < history.length; i++) {
        const prev = new Date(history[i - 1].createdAt).getTime();
        const curr = new Date(history[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('includes suspension data when present', async () => {
      const result = await service.getMedicalPass('mock-fighter-123');

      expect(result.data?.suspension).toBeDefined();
      expect(result.data?.suspension?.reason).toBeDefined();
    });
  });

  describe('addMedicalEntry', () => {
    it('adds entry to fighter medical history', async () => {
      const fighterId = 'test-fighter-add-entry';

      // Get initial state
      const before = await service.getMedicalPass(fighterId);
      const initialCount = before.data?.history.length || 0;

      // Add entry
      const result = await service.addMedicalEntry(fighterId, {
        entryType: 'pre_fight_check',
        notes: 'Test entry notes',
        medicName: 'Test Medic',
        medicId: 'medic-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.history.length).toBe(initialCount + 1);
    });

    it('adds entry with correct data', async () => {
      const fighterId = 'test-fighter-entry-data';

      await service.addMedicalEntry(fighterId, {
        entryType: 'injury_assessment',
        notes: 'Knee injury observed',
        medicName: 'Dr. Smith',
        medicId: 'dr-smith-123'
      });

      const result = await service.getMedicalPass(fighterId);
      const latestEntry = result.data?.history[0];

      expect(latestEntry?.entryType).toBe('injury_assessment');
      expect(latestEntry?.notes).toBe('Knee injury observed');
      expect(latestEntry?.medicName).toBe('Dr. Smith');
      expect(latestEntry?.medicId).toBe('dr-smith-123');
    });

    it('generates unique entry IDs', async () => {
      const fighterId = 'test-fighter-unique-ids';

      await service.addMedicalEntry(fighterId, {
        entryType: 'note',
        notes: 'First note'
      });

      await service.addMedicalEntry(fighterId, {
        entryType: 'note',
        notes: 'Second note'
      });

      const result = await service.getMedicalPass(fighterId);
      const ids = result.data?.history.map(e => e.id);
      const uniqueIds = new Set(ids);

      expect(ids?.length).toBe(uniqueIds.size);
    });

    it('sets createdAt timestamp', async () => {
      const fighterId = 'test-fighter-timestamp';
      const before = Date.now();

      await service.addMedicalEntry(fighterId, {
        entryType: 'medical_clearance',
        notes: 'Cleared'
      });

      const after = Date.now();
      const result = await service.getMedicalPass(fighterId);
      const entryTime = new Date(result.data?.history[0].createdAt || '').getTime();

      expect(entryTime).toBeGreaterThanOrEqual(before);
      expect(entryTime).toBeLessThanOrEqual(after);
    });

    it('supports all entry types', async () => {
      const entryTypes = [
        'pre_fight_check',
        'injury_assessment',
        'medical_clearance',
        'suspension_issued',
        'suspension_cleared',
        'note'
      ] as const;

      for (const entryType of entryTypes) {
        const fighterId = `test-fighter-${entryType}`;
        const result = await service.addMedicalEntry(fighterId, {
          entryType,
          notes: `Testing ${entryType}`
        });

        expect(result.success).toBe(true);
        expect(result.data?.history[0].entryType).toBe(entryType);
      }
    });
  });

  describe('setSuspension', () => {
    it('sets active suspension on fighter', async () => {
      const fighterId = 'test-fighter-suspension';

      const result = await service.setSuspension(fighterId, {
        active: true,
        reason: 'Concussion protocol',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        issuedBy: 'Dr. Test',
        notes: 'Rest required'
      });

      expect(result.success).toBe(true);
      expect(result.data?.suspension?.active).toBe(true);
      expect(result.data?.suspension?.reason).toBe('Concussion protocol');
      expect(result.data?.suspension?.issuedBy).toBe('Dr. Test');
    });

    it('clears suspension when undefined passed', async () => {
      const fighterId = 'test-fighter-clear-suspension';

      // First set a suspension
      await service.setSuspension(fighterId, {
        active: true,
        reason: 'Test suspension',
        startDate: new Date().toISOString(),
        issuedBy: 'Test'
      });

      // Then clear it
      const result = await service.setSuspension(fighterId, undefined);

      expect(result.success).toBe(true);
      expect(result.data?.suspension).toBeUndefined();
    });

    it('persists suspension across getMedicalPass calls', async () => {
      const fighterId = 'test-fighter-persist-suspension';

      await service.setSuspension(fighterId, {
        active: true,
        reason: 'Persistent suspension',
        startDate: new Date().toISOString(),
        issuedBy: 'Dr. Persist'
      });

      // Call getMedicalPass separately
      const result = await service.getMedicalPass(fighterId);

      expect(result.data?.suspension?.active).toBe(true);
      expect(result.data?.suspension?.reason).toBe('Persistent suspension');
    });
  });

  describe('getProfile', () => {
    it('returns medic profile for medic uid', async () => {
      const result = await service.getProfile('mock-medic-456');

      expect(result.success).toBe(true);
      expect(result.data?.userType).toBe('medic');
    });

    it('returns fighter profile for fighter uid', async () => {
      const result = await service.getProfile('mock-fighter-123');

      expect(result.success).toBe(true);
      expect(result.data?.userType).toBe('fighter');
    });
  });
});
