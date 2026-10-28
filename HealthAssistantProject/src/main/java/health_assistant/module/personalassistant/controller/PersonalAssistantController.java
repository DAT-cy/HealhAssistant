package health_assistant.module.personalassistant.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.personalassistant.dto.*;
import health_assistant.module.personalassistant.service.PersonalAssistantService;
import health_assistant.module.personalassistant.service.PersonalKnowledgeDocumentService;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/personal-assistant")
@RequiredArgsConstructor
public class PersonalAssistantController {
    private final PersonalAssistantService assistantService;
    private final PersonalKnowledgeDocumentService documentService;

    @GetMapping("/profile")
    public ResponseEntity<DefaultRes<PersonalAssistantProfileResponse>> profile() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, assistantService.profile(SecurityUtils.getCurrentUserId())));
    }

    @PutMapping("/profile")
    public ResponseEntity<DefaultRes<PersonalAssistantProfileResponse>> saveProfile(@Valid @RequestBody PersonalAssistantProfileRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, assistantService.saveProfile(SecurityUtils.getCurrentUserId(), request)));
    }

    @GetMapping("/documents")
    public ResponseEntity<DefaultRes<List<PersonalDocumentResponse>>> documents() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, documentService.list(SecurityUtils.getCurrentUserId())));
    }

    @PostMapping(value = "/documents/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DefaultRes<PersonalDocumentResponse>> upload(@RequestPart("file") MultipartFile file,
            @RequestPart("title") String title, @RequestPart(value = "description", required = false) String description) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED,
                documentService.uploadPdf(SecurityUtils.getCurrentUserId(), file, title, description)));
    }

    @PostMapping("/documents/text")
    public ResponseEntity<DefaultRes<PersonalDocumentResponse>> createText(@Valid @RequestBody PersonalDocumentTextRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, documentService.createText(SecurityUtils.getCurrentUserId(), request)));
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<DefaultRes<PersonalDocumentResponse>> document(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS,
                documentService.list(SecurityUtils.getCurrentUserId()).stream().filter(item -> item.id().equals(id)).findFirst()
                        .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Không tìm thấy tài liệu."))));
    }

    @GetMapping("/documents/{id}/content")
    public ResponseEntity<DefaultRes<String>> content(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, documentService.content(SecurityUtils.getCurrentUserId(), id)));
    }

    @PutMapping("/documents/{id}/content")
    public ResponseEntity<DefaultRes<PersonalDocumentResponse>> updateText(@PathVariable Long id, @Valid @RequestBody PersonalDocumentTextRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, documentService.updateText(SecurityUtils.getCurrentUserId(), id, request)));
    }

    @PatchMapping("/documents/{id}")
    public ResponseEntity<DefaultRes<PersonalDocumentResponse>> updateMetadata(@PathVariable Long id, @Valid @RequestBody PersonalDocumentMetadataRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS,
                documentService.updateMetadata(SecurityUtils.getCurrentUserId(), id, request.title(), request.description())));
    }

    @PostMapping("/documents/{id}/retry")
    public ResponseEntity<DefaultRes<PersonalDocumentResponse>> retry(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, documentService.retry(SecurityUtils.getCurrentUserId(), id)));
    }

    @GetMapping("/documents/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable Long id) {
        byte[] bytes = documentService.file(SecurityUtils.getCurrentUserId(), id);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=personal-document.pdf").body(bytes);
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<DefaultRes<Boolean>> delete(@PathVariable Long id) {
        documentService.delete(SecurityUtils.getCurrentUserId(), id);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, true));
    }

    @PostMapping("/chat")
    public ResponseEntity<DefaultRes<PersonalChatResponse>> chat(@Valid @RequestBody PersonalChatRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, assistantService.chat(SecurityUtils.getCurrentUserId(), request)));
    }

    @GetMapping("/threads/{threadId}")
    public ResponseEntity<DefaultRes<List<PersonalChatMessageResponse>>> history(@PathVariable String threadId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, assistantService.history(SecurityUtils.getCurrentUserId(), threadId)));
    }

    @DeleteMapping("/threads/{threadId}")
    public ResponseEntity<DefaultRes<Boolean>> deleteThread(@PathVariable String threadId) {
        assistantService.deleteThread(SecurityUtils.getCurrentUserId(), threadId);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, true));
    }
}
