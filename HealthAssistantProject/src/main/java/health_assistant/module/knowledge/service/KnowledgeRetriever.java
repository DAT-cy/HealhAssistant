package health_assistant.module.knowledge.service;

import health_assistant.module.knowledge.entity.KnowledgeChunk;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class KnowledgeRetriever {
    private static final Pattern WORDS = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Set<String> STOP_WORDS = Set.of("cho", "cua", "la", "va", "co", "the", "nao", "nhu", "toi", "ban", "mot", "cac", "nhung", "ve", "trong", "voi", "gi", "sao", "nen", "bao");
    private static final List<TopicTerms> TOPICS = List.of(
            new TopicTerms(List.of("thoi luong", "bao lau", "phut", "tuan", "moi tuan", "minutes", "duration"), List.of("duration", "minutes", "week", "weekly", "moderate", "vigorous")),
            new TopicTerms(List.of("loi ich", "suc khoe", "health", "benefit"), List.of("health", "benefits", "benefit", "mortality", "disease")),
            new TopicTerms(List.of("van dong", "tap luyen", "the duc", "activity", "exercise"), List.of("physical", "activity", "aerobic", "muscle", "strengthening", "sedentary")),
            new TopicTerms(List.of("nguoi lon", "truong thanh", "adult"), List.of("adult", "adults", "older")),
            new TopicTerms(List.of("tre em", "thanh thieu nien", "adolescent", "children"), List.of("children", "adolescents", "youth")),
            new TopicTerms(List.of("mang thai", "sau sinh", "pregnant", "postpartum"), List.of("pregnant", "postpartum", "pregnancy"))
    );

    private final KnowledgeChunkRepository chunkRepository;

    public List<Match> retrieve(String question) {
        Set<String> terms = expand(question);
        if (terms.isEmpty()) return List.of();
        List<Match> matches = new ArrayList<>();
        for (KnowledgeChunk chunk : chunkRepository.findAllApprovedWithDocument()) {
            Set<String> contentTerms = words(chunk.getContent());
            long matched = terms.stream().filter(contentTerms::contains).count();
            if (matched < 3) continue;
            double score = matched / Math.sqrt(Math.max(1, contentTerms.size()));
            matches.add(new Match(chunk, score));
        }
        return matches.stream().sorted(Comparator.comparingDouble(Match::score).reversed())
                .limit(4).toList();
    }

    private Set<String> expand(String question) {
        String normalized = normalize(question);
        Set<String> result = new LinkedHashSet<>(words(normalized));
        result.removeAll(STOP_WORDS);
        for (TopicTerms topic : TOPICS) {
            if (topic.triggers().stream().anyMatch(normalized::contains)) result.addAll(topic.expansion());
        }
        return result;
    }

    private Set<String> words(String text) {
        Set<String> result = new LinkedHashSet<>();
        for (String word : WORDS.split(normalize(text))) if (word.length() > 2) result.add(word);
        return result;
    }

    private String normalize(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    private record TopicTerms(List<String> triggers, List<String> expansion) { }
    public record Match(KnowledgeChunk chunk, double score) { }
}
