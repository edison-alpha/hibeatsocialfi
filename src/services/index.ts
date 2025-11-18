// Service initialization
// Connects BXP and Quest services to avoid circular dependencies

import { bxpService, setQuestService } from './bxpService';
import { questService } from './questService';

// Connect quest service to BXP service
setQuestService(questService);

export { bxpService, questService };
