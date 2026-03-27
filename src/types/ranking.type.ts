interface MyRank {
  myRanking: number;
}

interface RankItem {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  totalTime: number;
  rank: number;
}

export interface RankResult {
  myRanking: MyRank;
  topRankings: RankItem[];
  ranks: RankItem[];
}
