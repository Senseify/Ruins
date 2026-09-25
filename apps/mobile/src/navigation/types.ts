export type ScreenName =
  | 'HOME'
  | 'GAMES'
  | 'CREATE_GAME'
  | 'JOIN_GAME'
  | 'LOBBY'
  | 'ACTIVE_GAME'
  | 'RESULTS'
  | 'PROFILE'
  | 'SETTINGS';

export type RootStackParamList = {
  HOME: undefined;
  GAMES: undefined;
  CREATE_GAME: undefined;
  JOIN_GAME: undefined;
  LOBBY: { gameId: string; roomCode?: string };
  ACTIVE_GAME: { gameId: string; roomCode?: string };
  RESULTS: { matchId: string; outcome?: 'VICTORY' | 'DEFEAT' | 'DRAW' };
  PROFILE: undefined;
  SETTINGS: undefined;
};

export type NavTab = 'MAP' | 'GAMES' | 'PROFILE';
