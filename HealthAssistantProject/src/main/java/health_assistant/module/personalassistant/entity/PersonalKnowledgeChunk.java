package health_assistant.module.personalassistant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "personal_knowledge_chunks", indexes = @Index(name = "idx_personal_chunk_doc", columnList = "document_id,chunk_index"))
@Getter
@Setter
@NoArgsConstructor
public class PersonalKnowledgeChunk {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private PersonalKnowledgeDocument document;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String content;

    public PersonalKnowledgeChunk(PersonalKnowledgeDocument document, int chunkIndex, String content) {
        this.document = document; this.chunkIndex = chunkIndex; this.content = content;
    }
}
