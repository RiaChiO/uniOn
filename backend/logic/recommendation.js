const TAGS = ["study", "exercise", "culture", "game", "religion", "volunteer"];

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let key in a) {
    dot += a[key] * b[key];
    normA += a[key] * a[key];
    normB += b[key] * b[key];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function jaccardSimilarity(a, b) {
  let intersection = 0;
  let union = 0;

  for (let key in a) {
    if (a[key] > 0 || b[key] > 0) {
      union++;
      if (a[key] > 0 && b[key] > 0) {
        intersection++;
      }
    }
  }

  return intersection / union;
}

function makeTagVector(tagId) {
  const vector = Object.fromEntries(TAGS.map((tag) => [tag, 0]));

  if (tagId && Object.hasOwn(vector, tagId)) {
    vector[tagId] = 10;
  }

  return vector;
}

function makeParticipantVector(participantIds, usersById) {
  const averages = Object.fromEntries(TAGS.map((tag) => [tag, 0]));
  const validParticipants = participantIds.filter((participantId) => usersById[participantId]);

  if (validParticipants.length === 0) {
    return averages;
  }

  for (const participantId of validParticipants) {
    const vector = usersById[participantId].interestVector;

    for (const tag of TAGS) {
      averages[tag] += Number(vector?.[tag] ?? 0);
    }
  }

  for (const tag of TAGS) {
    averages[tag] = +(averages[tag] / validParticipants.length).toFixed(2);
  }

  return averages;
}

export function recommend(user, meetings, usersById) {
  const results = [];

  for (const [meetingId, meeting] of Object.entries(meetings)) {
    const participantVector = makeParticipantVector(meeting.participants ?? [], usersById);
    const tagVector = makeTagVector(meeting.tagId ?? meeting.tags?.[0]);

    const cosine = cosineSimilarity(
      user.interestVector,
      participantVector
    );

    const jaccard = jaccardSimilarity(
      user.interestVector,
      tagVector
    );

    const hybrid = cosine + jaccard;
    const finalScore = Math.round(hybrid * 50);

    results.push({
      meetingId,
      cosine,
      jaccard,
      finalScore
    });
  }

  return results.sort((a, b) => b.finalScore - a.finalScore);
}
