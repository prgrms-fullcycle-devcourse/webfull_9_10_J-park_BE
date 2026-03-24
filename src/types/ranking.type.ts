interface MyRank {
  myRanking: number;
}

interface TopRanks {
  topRanks: RankItem[];
}

interface RankItem {
  userId: number;
  nickname: string;
  profileImage: string;
  totalTime: string;
}
