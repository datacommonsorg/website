import { Query } from "../../../shared/topic_config";

export interface Place {
  dcid: string;
  name: string;
}

interface Topic {
  title: string;
  examples: {
    statvar: Query[];
  };
}

interface Topics {
  [topicName: string]: Topic;
}

export interface PlaceData {
  place: Place;
  topics: Topics;
}

export interface PlaceDataOverview {
  [key: string]: PlaceData;
}
