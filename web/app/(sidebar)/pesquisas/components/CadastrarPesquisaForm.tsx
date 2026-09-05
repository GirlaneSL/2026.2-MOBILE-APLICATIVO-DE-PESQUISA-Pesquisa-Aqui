'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CadastrarPesquisaForm() {
    return (
        <form
        // onSubmit={handleSubmit}
        >
            <div className="flex flex-col gap-5">
                <div>
                    <label htmlFor="title">Titulo*</label>
                    <Input
                        required
                        id="title"
                        placeholder="Pesquisa Exemplo"
                    // value={legalName}
                    // onChange={(e) => setLegalName(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="desc">Descrição*</label>
                    <Input
                        type="text"
                        required
                        id="desc"
                        placeholder="Descrição exemplo"
                    // value={contact}
                    // onChange={(e) => setContact(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="Ob">Objetivo*</label>
                    <Input
                        type="text"
                        required
                        id="Ob"
                        placeholder="Objetivo exemplo"
                    // value={contact}
                    // onChange={(e) => setContact(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="Vigência">Vigência*</label>
                    <Input
                        type="text"
                        required
                        id="Vigência"
                        placeholder="Objetivo Exemplo"
                    // value={contact}
                    // onChange={(e) => setContact(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="Público">Público Alvo*</label>
                    <Input
                        type="text"
                        required
                        id="Público"
                        placeholder="Público Alvo Exemplo"
                    // value={contact}
                    // onChange={(e) => setContact(e.target.value)}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" className="w-fit verde">
                        Cadastrar Pesquisa
                    </Button>
                </div>
            </div>
        </form>
    );
}