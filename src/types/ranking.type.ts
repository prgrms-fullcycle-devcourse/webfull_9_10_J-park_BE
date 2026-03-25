interface MyRank {
  myRanking: number;
}

interface RankItem {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  totalTime: string;
  rank: number;
}

interface RankResult {
  myRanking: MyRank;
  topRankings: RankItem[];
  ranks: RankItem[];
}
